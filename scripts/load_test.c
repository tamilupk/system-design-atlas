/*
 * Single-file C port of load_test.py's STRESS workload (not browser journeys).
 * macOS / Linux with libcurl development headers:
 *   cc -O2 -std=c11 -Wall -Wextra -Wpedantic load_test.c -o load_test -lcurl -lm
 *   ./load_test --json capacity-c.json
 *   ./load_test --fixed --users 1000 --duration 30 --json fixed-c.json
 *
 * Compare separately, on the same client and network, with:
 *   python3 load_test.py --fixed --users 1000 --duration 30 --json fixed-python.json
 * Repeat in alternating order; do not run both simultaneously.
 *
 * Matches Python stress defaults: target http://192.168.1.251:30080/,
 * 1000->2000->4000...32000 clients, then binary search to a gap <=50.
 * If the first stage fails, halve until a passing baseline is found.
 * One continuously busy connection per client, no pauses/client-cache skips,
 * same sorted discovered assets (home HTML + Vite chunks, CSS, images, fonts).
 * HTTP/1.1 keep-alive, Accept-Encoding:gzip, no Brotli or HTTP/2. Response bodies
 * are consumed without rendering or decompression during load. No redirects,
 * cache-busting, third-party requests, or application-level retries.
 * libcurl manages its connection pool and may recover stale reused connections;
 * therefore connection handling is not byte-for-byte identical to Python.
 *
 * Each stage: 3s ramp, 3s warmup, 2x10s windows; 3s cooldown between stages.
 * Budgets p50<=200ms, p95<=500ms, p99<=1000ms, 0% request errors. Windows use
 * all samples rounded up to 1ms; requests begun before a window are excluded.
 * A window also fails when >1% of completed-plus-pending requests remain
 * pending beyond p99. Mixed or undersampled windows stop as INCONCLUSIVE.
 * Capacity is workload-specific HTTP concurrency, not human readers.
 *
 * Full-body latency includes connection/TLS and libcurl scheduling. Encoded
 * response-body bytes exclude headers/framing. JSON includes stage histograms'
 * percentiles, requests/sec (including drain), CPU cores and window decisions.
 * Client descriptor/port exhaustion or excessive event-loop lag is INCONCLUSIVE,
 * not a server failure. This process may raise its own soft descriptor limit
 * within the existing hard limit. Ctrl-C drains current requests and saves JSON.
 * --fixed evaluates errors only, not latency thresholds. No server CPU measured.
 * Exit codes: 0 no failure reached, 1 failure bound found, 2 inconclusive/error,
 * 130 interrupted. Requires libcurl >= 7.68.0. No Python/node/browser needed.
 */
#define _POSIX_C_SOURCE 200809L
#include <curl/curl.h>
#include <ctype.h>
#include <errno.h>
#include <getopt.h>
#include <inttypes.h>
#include <limits.h>
#include <math.h>
#include <regex.h>
#include <signal.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/ioctl.h>
#include <sys/resource.h>
#include <time.h>
#include <unistd.h>

#define ASSET_LIMIT 1000
#define BODY_LIMIT (16u * 1024u * 1024u)
#define WINDOW_LIMIT 100
#define STAGE_LIMIT 100
static volatile sig_atomic_t interrupted;
static void on_signal(int sig) { (void)sig; interrupted = 1; }
static double now(void) { struct timespec t; clock_gettime(CLOCK_MONOTONIC, &t); return t.tv_sec + t.tv_nsec / 1e9; }
static double cpu_now(void) { struct timespec t; clock_gettime(CLOCK_PROCESS_CPUTIME_ID, &t); return t.tv_sec + t.tv_nsec / 1e9; }
static void die(const char *s) { fprintf(stderr, "ERROR: %s\n", s); exit(2); }
static void *alloc(size_t n, size_t size) { void *p = calloc(n, size); if (!p) die("Out of memory in load generator"); return p; }
static char *copy(const char *s) { char *p = strdup(s); if (!p) die("Out of memory"); return p; }
static void pause_for(double seconds) {
    double end = now() + seconds;
    while (!interrupted && now() < end) {
        struct timespec t = {0, 50000000}; nanosleep(&t, NULL);
    }
}

typedef struct {
    char *url, *json;
    int start, maximum, resolution, connections, windows, fail_windows, min_samples;
    double ramp, warmup, window, cooldown, duration, timeout, p50, p95, p99, error_rate, max_lag;
    bool fixed, inspect, color;
} Options;
static Options opt = {
    .start=1000, .maximum=32000, .resolution=50, .connections=1,
    .windows=2, .fail_windows=2, .min_samples=100,
    .ramp=3, .warmup=3, .window=10, .cooldown=3, .duration=60, .timeout=10,
    .p50=200, .p95=500, .p99=1000, .max_lag=100
};
typedef struct { char *url, *path; uint64_t bytes; } Asset;
static Asset assets[ASSET_LIMIT];
static int asset_count;
static CURLU *origin;
static char *scheme, *host, *port;

static bool same_part(CURLU *u, CURLUPart part, const char *expected, unsigned flags) {
    char *s=NULL; CURLUcode code=curl_url_get(u, part, &s, flags);
    bool match=code==CURLUE_OK && !strcmp(s, expected); curl_free(s); return match;
}
static bool extension_ok(const char *path) {
    const char *ext=strrchr(path, '.'); if (!ext) return false;
    const char *allowed[]={".js",".mjs",".css",".svg",".png",".jpg",".jpeg",".webp",".ico",".woff",".woff2",NULL};
    for (int i=0; allowed[i]; ++i) if (!strcmp(ext,allowed[i])) return true;
    return false;
}
static bool mime_ok(const char *path, long status, const char *type) {
    if (status<200 || status>=300) return false;
    if (!type) type="";
    char *p=copy(path), *q=strchr(p,'?'); if(q) *q=0;
    const char *ext=strrchr(p,'.'); bool ok=true;
    if (ext && (!strcmp(ext,".js") || !strcmp(ext,".mjs"))) ok=strstr(type,"javascript") || strstr(type,"ecmascript");
    else if (ext && !strcmp(ext,".css")) ok=strstr(type,"text/css")!=NULL;
    else if (ext && extension_ok(p)) ok=strstr(type,"text/html")==NULL;
    free(p); return ok;
}
static void add_asset(const char *base, const char *ref, bool root) {
    if (!*ref || ref[0]=='#' || !strncmp(ref,"data:",5) || !strncmp(ref,"blob:",5)) return;
    CURLU *u=curl_url(); if(!u) die("curl_url failed");
    const char *parent=!strncmp(ref,"assets/",7) ? opt.url : base;
    if(curl_url_set(u,CURLUPART_URL,parent,0) || curl_url_set(u,CURLUPART_URL,ref,0)) { curl_url_cleanup(u); return; }
    curl_url_set(u,CURLUPART_FRAGMENT,NULL,0);
    if(!same_part(u,CURLUPART_SCHEME,scheme,0) || !same_part(u,CURLUPART_HOST,host,0) ||
       !same_part(u,CURLUPART_PORT,port,CURLU_DEFAULT_PORT)) { curl_url_cleanup(u); return; }
    char *path=NULL,*url=NULL; curl_url_get(u,CURLUPART_PATH,&path,0);
    if(!path || (!root && !extension_ok(path))) { curl_free(path); curl_url_cleanup(u); return; }
    curl_url_get(u,CURLUPART_URL,&url,0);
    for(int i=0;i<asset_count;++i) if(!strcmp(assets[i].url,url)) { curl_free(path); curl_free(url); curl_url_cleanup(u); return; }
    if(asset_count>=ASSET_LIMIT) die("Discovery exceeds 1000 assets");
    char *query=NULL; curl_url_get(u,CURLUPART_QUERY,&query,0);
    size_t n=strlen(path)+(query?strlen(query)+1:0)+1;
    assets[asset_count].path=alloc(n,1);
    snprintf(assets[asset_count].path,n,"%s%s%s",path,query?"?":"",query?query:"");
    assets[asset_count++].url=copy(url);
    curl_free(query); curl_free(path); curl_free(url); curl_url_cleanup(u);
}
typedef struct { char *data; size_t size; } Body;
static size_t capture(char *data,size_t size,size_t n,void *context) {
    Body *b=context; size_t len=size*n;
    if(len>BODY_LIMIT-b->size) return 0;
    char *p=realloc(b->data,b->size+len+1); if(!p) return 0;
    b->data=p; memcpy(p+b->size,data,len); b->size+=len; p[b->size]=0; return len;
}
static void scan(regex_t *pattern,const char *text,const char *base,int group) {
    regmatch_t match[4];
    while(regexec(pattern,text,4,match,0)==0) {
        if(match[group].rm_so>=0) {
            size_t len=(size_t)(match[group].rm_eo-match[group].rm_so);
            char *ref=alloc(len+1,1); memcpy(ref,text+match[group].rm_so,len);
            const char *ext=strrchr(base,'.');
            bool js=ext && (!strcmp(ext,".js") || !strcmp(ext,".mjs"));
            if(!js || !strncmp(ref,"./",2) || !strncmp(ref,"../",3) ||
               !strncmp(ref,"/assets/",8) || !strncmp(ref,"assets/",7)) add_asset(base,ref,false);
            free(ref);
        }
        if(match[0].rm_eo<=0) break;
        text+=match[0].rm_eo;
    }
}
static int asset_compare(const void *a,const void *b) { return strcmp(((const Asset*)a)->path,((const Asset*)b)->path); }
static void discover(void) {
    regex_t quoted,css;
    if(regcomp(&quoted,"[\"']([^\"' \t\r\n<>]+)[\"']",REG_EXTENDED) ||
       regcomp(&css,"url\\([ \t\r\n]*[\"']?([^\"') \t\r\n]+)[\"']?[ \t\r\n]*\\)",REG_EXTENDED)) die("Regex compilation failed");
    add_asset(opt.url,opt.url,true);
    CURL *curl=curl_easy_init(); if(!curl) die("curl_easy_init failed");
    curl_easy_setopt(curl,CURLOPT_PROXY,"");
    curl_easy_setopt(curl,CURLOPT_HTTP_VERSION,CURL_HTTP_VERSION_1_1);
    curl_easy_setopt(curl,CURLOPT_ACCEPT_ENCODING,"gzip");
    curl_easy_setopt(curl,CURLOPT_TIMEOUT_MS,(long)ceil(opt.timeout*1000));
    curl_easy_setopt(curl,CURLOPT_WRITEFUNCTION,capture);
    curl_easy_setopt(curl,CURLOPT_USERAGENT,"AtlasLoadTest/2.0");
    for(int i=0;i<asset_count && !interrupted;++i) {
        Body body={0}; long status=0; char *type=NULL;
        curl_easy_setopt(curl,CURLOPT_URL,assets[i].url);
        curl_easy_setopt(curl,CURLOPT_WRITEDATA,&body);
        CURLcode result=curl_easy_perform(curl);
        curl_easy_getinfo(curl,CURLINFO_RESPONSE_CODE,&status);
        curl_easy_getinfo(curl,CURLINFO_CONTENT_TYPE,&type);
        if(result!=CURLE_OK || !mime_ok(assets[i].path,status,type)) {
            fprintf(stderr,"Discovery failed: %s HTTP %ld: %s\n",assets[i].path,status,curl_easy_strerror(result));
            free(body.data); die("Cannot discover current deployment");
        }
        curl_off_t bytes=0; curl_easy_getinfo(curl,CURLINFO_SIZE_DOWNLOAD_T,&bytes); assets[i].bytes=(uint64_t)bytes;
        const char *ext=strrchr(assets[i].path,'.');
        if(body.data && (!strcmp(assets[i].path,"/") || (ext && (!strcmp(ext,".js") || !strcmp(ext,".mjs") || !strcmp(ext,".css"))))) {
            scan(&quoted,body.data,assets[i].url,1);
            if(ext && !strcmp(ext,".css")) scan(&css,body.data,assets[i].url,1);
        }
        free(body.data);
    }
    curl_easy_cleanup(curl); regfree(&quoted); regfree(&css);
    qsort(assets,(size_t)asset_count,sizeof(Asset),asset_compare);
}

typedef struct { uint64_t *bins,count,errors,bytes; } Stats;
static size_t bin_count;
static Stats new_stats(void) { Stats s={0}; s.bins=alloc(bin_count,sizeof(uint64_t)); return s; }
static void reset_stats(Stats *s) { memset(s->bins,0,bin_count*sizeof(uint64_t)); s->count=s->errors=s->bytes=0; }
static void record(Stats *s,double ms,uint64_t bytes,bool error) {
    size_t bin=(size_t)fmax(0,ceil(ms)); if(bin>=bin_count) bin=bin_count-1;
    s->bins[bin]++; s->count++; s->bytes+=bytes; s->errors+=error;
}
static double pct(const Stats *s,double p) {
    if(!s->count) return 0;
    uint64_t target=(uint64_t)ceil((double)s->count*p),sum=0;
    for(size_t i=0;i<bin_count;++i) { sum+=s->bins[i]; if(sum>=target) return (double)i; }
    return (double)(bin_count-1);
}
typedef enum { PASS,FAIL,INCONCLUSIVE,INTERRUPTED } Verdict;
static const char *verdict_name(Verdict v) { const char *n[]={"PASS","FAIL","INCONCLUSIVE","INTERRUPTED"}; return n[v]; }
typedef struct {
    uint64_t requests,errors,bytes; double p50,p95,p99,seconds,lag;
    int pending,overdue; Verdict verdict; char reason[512];
} Window;
typedef struct {
    int users,peak; Verdict verdict; char reason[512],last_error[512];
    uint64_t requests,errors,bytes; double elapsed,rps,p50,p95,p99,cpu;
    int window_count; Window windows[WINDOW_LIMIT];
} Stage;
typedef struct {
    CURL *easy; size_t offset; double started,retry_at; uint64_t bytes;
    int id,path; bool launched,inflight; char error[CURL_ERROR_SIZE];
} Lane;
static size_t discard(char *data,size_t size,size_t n,void *context) {
    (void)data; Lane *lane=context; lane->bytes+=(uint64_t)(size*n); return size*n;
}
static bool generator_errno(long code) {
    return code==EMFILE || code==ENFILE || code==ENOMEM || code==ENOBUFS || code==EAGAIN || code==EADDRNOTAVAIL;
}
static bool descriptors(int lanes,char *reason,size_t size) {
    struct rlimit lim;
    if(getrlimit(RLIMIT_NOFILE,&lim)) { snprintf(reason,size,"Cannot inspect descriptor limit: %s",strerror(errno)); return false; }
    rlim_t need=(rlim_t)lanes+128;
    if(lim.rlim_cur>=need) return true;
    if(lim.rlim_max!=RLIM_INFINITY && need>lim.rlim_max) {
        snprintf(reason,size,"Generator needs %llu descriptors; hard limit is %llu",(unsigned long long)need,(unsigned long long)lim.rlim_max); return false;
    }
    lim.rlim_cur=need;
    if(setrlimit(RLIMIT_NOFILE,&lim)) { snprintf(reason,size,"Cannot raise generator soft descriptor limit: %s",strerror(errno)); return false; }
    return true;
}
static bool submit(CURLM *multi,Lane *lane) {
    lane->path=(int)lane->offset; lane->offset=(lane->offset+1)%(size_t)asset_count;
    lane->bytes=0; lane->error[0]=0;
    if(curl_easy_setopt(lane->easy,CURLOPT_URL,assets[lane->path].url)!=CURLE_OK) return false;
    lane->started=now();
    if(curl_multi_add_handle(multi,lane->easy)!=CURLM_OK) return false;
    lane->inflight=true; return true;
}
static void append_reason(char *reason,size_t size,const char *text) {
    size_t used=strlen(reason); if(used+1>=size) return;
    snprintf(reason+used,size-used,"%s%s",used?"; ":"",text);
}
static Window evaluate(const Stats *s,const Stats *lag,double seconds,int pending,int overdue) {
    Window w={.requests=s->count,.errors=s->errors,.bytes=s->bytes,.p50=pct(s,.5),.p95=pct(s,.95),.p99=pct(s,.99),
              .seconds=seconds,.pending=pending,.overdue=overdue,.lag=pct(lag,.95),.verdict=PASS};
    char reason[160];
    if(w.lag>opt.max_lag) { w.verdict=INCONCLUSIVE; snprintf(w.reason,sizeof(w.reason),"Generator event-loop p95 lag %.0f ms exceeds %.0f ms",w.lag,opt.max_lag); return w; }
    if((double)overdue>.01*((double)s->count+pending)) append_reason(w.reason,sizeof(w.reason),">1% pending beyond p99 budget");
    if(s->errors && opt.error_rate==0) append_reason(w.reason,sizeof(w.reason),"Request errors; budget allows none");
    if(s->count<(uint64_t)opt.min_samples) {
        w.verdict=*w.reason?FAIL:INCONCLUSIVE;
        if(!*w.reason) snprintf(w.reason,sizeof(w.reason),"Insufficient samples: %" PRIu64 " / %d",s->count,opt.min_samples);
        return w;
    }
    const double values[]={w.p50,w.p95,w.p99},limits[]={opt.p50,opt.p95,opt.p99}; const char *names[]={"p50","p95","p99"};
    for(int i=0;i<3;++i) if(values[i]>limits[i]) {
        snprintf(reason,sizeof(reason),"%s %.0f > %.0f ms",names[i],values[i],limits[i]); append_reason(w.reason,sizeof(w.reason),reason);
    }
    double rate=100.0*(double)s->errors/(double)s->count;
    if(opt.error_rate>0 && rate>opt.error_rate) append_reason(w.reason,sizeof(w.reason),"Error-rate budget exceeded");
    if(*w.reason) w.verdict=FAIL;
    return w;
}
static int dashboard_lines;
static void dashboard(const char *phase,int users,int active,int pending,const Stats *stats,const Stats *lat,
                      double elapsed,double rps,double cpu,double lag) {
    bool tty=isatty(STDOUT_FILENO); struct winsize ws={0}; ioctl(STDOUT_FILENO,TIOCGWINSZ,&ws);
    int width=ws.ws_col?ws.ws_col-1:120; if(width<20) width=20;
    if(tty && dashboard_lines) printf("\033[%dA",dashboard_lines);
    char lines[5][512];
    snprintf(lines[0],sizeof(lines[0]),"%s | %.1fs | target %d users",phase,elapsed,users);
    snprintf(lines[1],sizeof(lines[1]),"Active users: %d | HTTP in-flight: %d",active,pending);
    snprintf(lines[2],sizeof(lines[2]),"Requests: %" PRIu64 " | RPS: %.1f | Errors: %" PRIu64,stats->count,rps,stats->errors);
    snprintf(lines[3],sizeof(lines[3]),"p50 / p95 / p99: %.0f / %.0f / %.0f ms",pct(lat,.5),pct(lat,.95),pct(lat,.99));
    snprintf(lines[4],sizeof(lines[4]),"Downloaded: %.1f MiB | Client CPU: %.2f cores | Loop lag: %.1f ms",stats->bytes/1048576.0,cpu,lag);
    for(int i=0;i<5;++i) {
        if(tty) printf("\033[2K");
        if(opt.color && i==0) printf("\033[1;36m");
        if(tty) printf("%.*s",width,lines[i]); else printf("%s",lines[i]);
        if(opt.color && i==0) printf("\033[0m");
        printf("%s",tty || i==4?"\n":" | ");
    }
    dashboard_lines=tty?5:0; fflush(stdout);
}
static void stage_log(const char *text) { dashboard_lines=0; puts(text); fflush(stdout); }

static Stage run_stage(int users) {
    Stage result={.users=users,.verdict=INCONCLUSIVE}; strcpy(result.reason,"Measurement did not finish");
    int count=users*opt.connections;
    if(!descriptors(count,result.reason,sizeof(result.reason))) return result;
    Lane *lanes=alloc((size_t)count,sizeof(Lane));
    Stats total=new_stats(),window=new_stats(),lagstats=new_stats();
    CURLM *multi=curl_multi_init(); if(!multi) die("curl_multi_init failed");
    if(curl_multi_setopt(multi,CURLMOPT_MAX_TOTAL_CONNECTIONS,(long)count)!=CURLM_OK ||
       curl_multi_setopt(multi,CURLMOPT_MAX_HOST_CONNECTIONS,(long)count)!=CURLM_OK ||
       curl_multi_setopt(multi,CURLMOPT_MAXCONNECTS,(long)count)!=CURLM_OK) die("Cannot configure connection pool");
    for(int i=0;i<count;++i) {
        Lane *l=&lanes[i]; l->id=i; l->offset=(size_t)i%(size_t)asset_count; l->easy=curl_easy_init();
        if(!l->easy) die("Cannot allocate curl handle");
#define SET(name,value) do { if(curl_easy_setopt(l->easy,name,value)!=CURLE_OK) die("curl option failed: " #name); } while(0)
        SET(CURLOPT_PROXY,""); SET(CURLOPT_PRIVATE,l); SET(CURLOPT_WRITEFUNCTION,discard); SET(CURLOPT_WRITEDATA,l);
        SET(CURLOPT_HTTP_VERSION,CURL_HTTP_VERSION_1_1); SET(CURLOPT_ACCEPT_ENCODING,"gzip");
        SET(CURLOPT_HTTP_CONTENT_DECODING,0L); SET(CURLOPT_USERAGENT,"AtlasLoadTest/2.0");
        SET(CURLOPT_TIMEOUT_MS,(long)ceil(opt.timeout*1000)); SET(CURLOPT_NOSIGNAL,1L);
        SET(CURLOPT_ERRORBUFFER,l->error); SET(CURLOPT_FOLLOWLOCATION,0L);
#undef SET
    }
    double start=now(),cpu_start=cpu_now(),display_at=-1,previous=start,window_start=-1,ready=-1,lag_due=start+.1,last_lag=0;
    uint64_t previous_requests=0; int launched=0,pending=0,streak=0; bool draining=false,generator=false;
    for(;;) {
        double t=now();
        if(interrupted && !draining) { result.verdict=INTERRUPTED; strcpy(result.reason,"Stopped by user"); draining=true; }
        if(!draining && opt.fixed && t-start>=opt.duration) {
            result.verdict=total.errors?FAIL:PASS; strcpy(result.reason,"Fixed duration completed; latency budgets not evaluated"); draining=true;
        }
        if(!draining) {
            for(int i=0;i<count;++i) {
                Lane *l=&lanes[i]; double delay=users>1?opt.ramp*(i/opt.connections)/(users-1):0;
                if(!l->inflight && t-start>=delay && t>=l->retry_at) {
                    if(!l->launched) { l->launched=true; launched++; }
                    if(!submit(multi,l)) { generator=true; snprintf(result.reason,sizeof(result.reason),"Generator could not submit request"); draining=true; break; }
                    pending++; if(pending>result.peak) result.peak=pending;
                }
            }
        }
        int running=0; CURLMcode mc=curl_multi_perform(multi,&running);
        if(mc!=CURLM_OK) { generator=true; draining=true; snprintf(result.reason,sizeof(result.reason),"libcurl multi failure: %s",curl_multi_strerror(mc)); break; }
        int left=0; CURLMsg *msg;
        while((msg=curl_multi_info_read(multi,&left))) {
            if(msg->msg!=CURLMSG_DONE) continue;
            Lane *l=NULL; long status=0,oserror=0; char *type=NULL;
            curl_easy_getinfo(msg->easy_handle,CURLINFO_PRIVATE,&l);
            curl_easy_getinfo(msg->easy_handle,CURLINFO_RESPONSE_CODE,&status);
            curl_easy_getinfo(msg->easy_handle,CURLINFO_CONTENT_TYPE,&type);
            curl_easy_getinfo(msg->easy_handle,CURLINFO_OS_ERRNO,&oserror);
            bool error=msg->data.result!=CURLE_OK || !mime_ok(assets[l->path].path,status,type);
            double ended=now(),ms=(ended-l->started)*1000;
            record(&total,ms,l->bytes,error);
            if(window_start>=0 && l->started>=window_start) record(&window,ms,l->bytes,error);
            if(error) {
                snprintf(result.last_error,sizeof(result.last_error),"%s: HTTP %ld, %s (%s)",assets[l->path].path,status,curl_easy_strerror(msg->data.result),l->error);
                l->retry_at=ended+.01;
                if(generator_errno(oserror) || msg->data.result==CURLE_OUT_OF_MEMORY) {
                    generator=true; draining=true; snprintf(result.reason,sizeof(result.reason),"Generator resource failure (OS errno %ld)",oserror);
                }
            }
            curl_multi_remove_handle(multi,l->easy); l->inflight=false; pending--;
        }
        t=now();
        if(t>=lag_due) {
            last_lag=fmax(0,(t-lag_due)*1000);
            if(window_start>=0) record(&lagstats,last_lag,0,false);
            lag_due=t+.1;
        }
        if(!draining && !opt.fixed) {
            if(launched==count && ready<0) ready=t;
            if(ready>=0 && window_start<0 && t-ready>=opt.warmup) {
                window_start=t; reset_stats(&window); reset_stats(&lagstats);
            }
            if(window_start>=0 && t-window_start>=opt.window) {
                int overdue=0;
                for(int i=0;i<count;++i) if(lanes[i].inflight && (t-lanes[i].started)*1000>opt.p99) overdue++;
                Window w=evaluate(&window,&lagstats,t-window_start,pending,overdue);
                result.windows[result.window_count++]=w;
                char line[1024]; snprintf(line,sizeof(line),"  Window %d: %s | %" PRIu64 " requests | p50/p95/p99 %.0f/%.0f/%.0f ms | errors %" PRIu64 " (%.4f%%)%s%s",
                    result.window_count,verdict_name(w.verdict),w.requests,w.p50,w.p95,w.p99,w.errors,
                    100.0*w.errors/(w.requests?w.requests:1),*w.reason?" | ":"",w.reason);
                stage_log(line); streak=w.verdict==FAIL?streak+1:0;
                if(w.verdict==INCONCLUSIVE) { result.verdict=INCONCLUSIVE; snprintf(result.reason,sizeof(result.reason),"%s",w.reason); draining=true; }
                else if(streak>=opt.fail_windows) { result.verdict=FAIL; snprintf(result.reason,sizeof(result.reason),"Sustained failure: %.480s",w.reason); draining=true; }
                else if(result.window_count>=opt.windows) {
                    bool all=true; for(int i=0;i<result.window_count;++i) if(result.windows[i].verdict!=PASS) all=false;
                    result.verdict=all?PASS:INCONCLUSIVE;
                    snprintf(result.reason,sizeof(result.reason),"%s",all?"Every window passed":"Mixed windows; no stable pass or sustained failure"); draining=true;
                } else { window_start=t; reset_stats(&window); reset_stats(&lagstats); }
            }
        }
        if(t-display_at>=(isatty(STDOUT_FILENO)?1:5)) {
            char phase[64];
            if(draining) strcpy(phase,"DRAINING"); else if(opt.fixed) strcpy(phase,"FIXED LOAD");
            else if(window_start>=0) snprintf(phase,sizeof(phase),"MEASURE %d/%d",result.window_count+1,opt.windows);
            else strcpy(phase,"RAMP / WARMUP");
            dashboard(phase,users,launched/opt.connections,pending,&total,window_start>=0?&window:&total,
                      t-start,(total.count-previous_requests)/fmax(.001,t-previous),(cpu_now()-cpu_start)/fmax(.001,t-start),last_lag);
            previous=t; previous_requests=total.count; display_at=t;
        }
        if(draining && pending==0) break;
        /* Completed lanes are resubmitted immediately, without a poll-induced pause. */
        bool can_submit=false;
        if(!draining) for(int i=0;i<count;++i) if(lanes[i].launched && !lanes[i].inflight && now()>=lanes[i].retry_at) { can_submit=true; break; }
        if(!can_submit) {
            int numfds=0; mc=curl_multi_poll(multi,NULL,0,50,&numfds);
            if(mc!=CURLM_OK) { generator=true; snprintf(result.reason,sizeof(result.reason),"Generator poll failure"); break; }
        }
    }
    if(opt.fixed && total.errors && result.verdict==PASS) result.verdict=FAIL;
    if(generator) result.verdict=INCONCLUSIVE;
    if(interrupted) { result.verdict=INTERRUPTED; strcpy(result.reason,"Stopped by user"); }
    for(int i=0;i<count;++i) { if(lanes[i].inflight) curl_multi_remove_handle(multi,lanes[i].easy); curl_easy_cleanup(lanes[i].easy); }
    curl_multi_cleanup(multi); free(lanes);
    result.elapsed=now()-start; result.requests=total.count; result.errors=total.errors; result.bytes=total.bytes;
    result.rps=total.count/fmax(.001,result.elapsed); result.cpu=(cpu_now()-cpu_start)/fmax(.001,result.elapsed);
    result.p50=pct(&total,.5); result.p95=pct(&total,.95); result.p99=pct(&total,.99);
    free(total.bins); free(window.bins); free(lagstats.bins);
    char line[1024]; snprintf(line,sizeof(line),"%d users: %s -- %s",users,verdict_name(result.verdict),result.reason); stage_log(line);
    snprintf(line,sizeof(line),"  %" PRIu64 " requests | %.1f req/s incl. drain | peak %d in-flight | %.1f MiB | %" PRIu64 " errors | CPU %.2f cores",
             result.requests,result.rps,result.peak,result.bytes/1048576.0,result.errors,result.cpu); stage_log(line);
    if(*result.last_error) stage_log(result.last_error);
    return result;
}

static void json_string(FILE *f,const char *text) {
    fputc('"',f);
    for(const unsigned char *p=(const unsigned char*)text;*p;++p) {
        if(*p=='"' || *p=='\\') { fputc('\\',f); fputc(*p,f); }
        else if(*p<32) fprintf(f,"\\u%04x",*p); else fputc(*p,f);
    }
    fputc('"',f);
}
static void nullable(FILE *f,int n) { if(n>0) fprintf(f,"%d",n); else fputs("null",f); }
static void save_report(const Stage *stages,int count,Verdict verdict,int passed,int failed,int first) {
    if(!opt.json) return;
    FILE *f=fopen(opt.json,"w"); if(!f) die("Cannot open JSON output");
    fputs("{\n\"engine\":\"C/libcurl\",\"target\":",f); json_string(f,opt.url);
    fputs(",\"verdict\":",f); json_string(f,verdict_name(verdict));
    fputs(",\"highest_passing_users\":",f); nullable(f,passed);
    fputs(",\"lowest_failing_users\":",f); nullable(f,failed);
    fputs(",\"first_failing_users\":",f); nullable(f,first);
    fprintf(f,",\"search_complete\":%s,\n\"settings\":{\"mode\":\"stress\",\"users\":%d,\"max_users\":%d,\"resolution\":%d,"
            "\"connections\":%d,\"ramp\":%g,\"warmup\":%g,\"window\":%g,\"windows\":%d,\"fail_windows\":%d,"
            "\"min_samples\":%d,\"duration\":%g,\"timeout\":%g,\"cooldown\":%g,\"p50_ms\":%g,\"p95_ms\":%g,\"p99_ms\":%g,"
            "\"max_error_rate\":%g,\"max_loop_lag_ms\":%g,\"fixed\":%s},\n\"stages\":[\n",
            verdict==INCONCLUSIVE||verdict==INTERRUPTED?"false":"true",opt.start,opt.maximum,opt.resolution,opt.connections,
            opt.ramp,opt.warmup,opt.window,opt.windows,opt.fail_windows,opt.min_samples,opt.duration,opt.timeout,opt.cooldown,
            opt.p50,opt.p95,opt.p99,opt.error_rate,opt.max_lag,opt.fixed?"true":"false");
    for(int i=0;i<count;++i) {
        const Stage *s=&stages[i]; if(i) fputs(",\n",f);
        fprintf(f,"{\"users\":%d,\"verdict\":",s->users); json_string(f,verdict_name(s->verdict));
        fputs(",\"reason\":",f); json_string(f,s->reason);
        fprintf(f,",\"requests\":%" PRIu64 ",\"errors\":%" PRIu64 ",\"bytes\":%" PRIu64 ",\"peak\":%d,"
                "\"elapsed_seconds\":%.6f,\"mean_rps\":%.6f,\"p50_ms\":%.0f,\"p95_ms\":%.0f,\"p99_ms\":%.0f,\"generator_cpu_cores\":%.6f,\"windows\":[",
                s->requests,s->errors,s->bytes,s->peak,s->elapsed,s->rps,s->p50,s->p95,s->p99,s->cpu);
        for(int j=0;j<s->window_count;++j) {
            const Window *w=&s->windows[j]; if(j) fputc(',',f);
            fprintf(f,"{\"requests\":%" PRIu64 ",\"errors\":%" PRIu64 ",\"bytes\":%" PRIu64 ",\"p50_ms\":%.0f,\"p95_ms\":%.0f,\"p99_ms\":%.0f,"
                    "\"seconds\":%.6f,\"pending_requests\":%d,\"overdue_requests\":%d,\"loop_lag_p95_ms\":%.0f,\"status\":",
                    w->requests,w->errors,w->bytes,w->p50,w->p95,w->p99,w->seconds,w->pending,w->overdue,w->lag);
            json_string(f,verdict_name(w->verdict)); fputs(",\"reason\":",f); json_string(f,w->reason); fputc('}',f);
        }
        fputs("],\"last_error\":",f); json_string(f,s->last_error); fputc('}',f);
    }
    fputs("\n]}\n",f); if(fclose(f)) die("Writing JSON output failed");
    printf("Saved report: %s\n",opt.json);
}
static double number(const char *s) { char *end; errno=0; double v=strtod(s,&end); if(errno || end==s || *end || !isfinite(v) || v<0) die("Invalid numeric option"); return v; }
static int integer(const char *s) { double n=number(s); if(n<1 || n>1000000 || floor(n)!=n) die("Integer option must be 1..1000000"); return (int)n; }
static void usage(void) {
    puts("C/libcurl HTTP capacity search. Default target http://192.168.1.251:30080/\n"
         "Build: cc -O2 -std=c11 -Wall -Wextra -Wpedantic load_test.c -o load_test -lcurl -lm\n"
         "Run:   ./load_test --json capacity-c.json\n"
         "Compare: ./load_test --fixed --users 1000 --duration 30 --json fixed-c.json\n\n"
         "--url URL                 Origin URL, no subpath/query/credentials\n"
         "--start-users N / --users N  Default 1000\n"
         "--max-users N             Default 32000\n"
         "--resolution N            Binary-search gap, default 50\n"
         "--connections N           HTTP connections per client, default 1\n"
         "--ramp SECONDS            Default 3\n"
         "--warmup SECONDS          Default 3\n"
         "--window SECONDS          Default 10\n"
         "--windows N               Default 2\n"
         "--fail-windows N          Consecutive failures required, default 2\n"
         "--min-samples N           Per window, default 100\n"
         "--p50-ms N --p95-ms N --p99-ms N   Defaults 200, 500, 1000\n"
         "--max-error-rate PERCENT  Default 0\n"
         "--max-loop-lag-ms N       Client scheduling budget, default 100\n"
         "--timeout SECONDS         Request timeout, default 10, maximum 600\n"
         "--cooldown SECONDS        Between stages, default 3\n"
         "--fixed --duration SECONDS  Fixed-client run, default duration 60\n"
         "--inspect                 Discover and list assets without load\n"
         "--json FILE --no-color --help\n\n"
         "Stress workload only: no pauses/cache skips, HTTP/1.1 and gzip.\n"
         "Default: double until failure, then binary search. Inconclusive stages stop.\n"
         "Run C and Python separately and alternate ordering for a fair comparison.");
}
int main(int argc,char **argv) {
    enum { URL=1000,USERS,MAXIMUM,RESOLUTION,CONNECTIONS,RAMP,WARMUP,WINDOW,WINDOWS,FAIL_WINDOWS,MIN_SAMPLES,
           P50,P95,P99,ERROR_RATE,MAX_LAG,TIMEOUT,COOLDOWN,FIXED,DURATION,INSPECT,JSON,NO_COLOR,HELP };
    const struct option options[]={
        {"url",1,0,URL},{"users",1,0,USERS},{"start-users",1,0,USERS},{"max-users",1,0,MAXIMUM},
        {"resolution",1,0,RESOLUTION},{"connections",1,0,CONNECTIONS},{"ramp",1,0,RAMP},{"warmup",1,0,WARMUP},
        {"window",1,0,WINDOW},{"windows",1,0,WINDOWS},{"fail-windows",1,0,FAIL_WINDOWS},{"min-samples",1,0,MIN_SAMPLES},
        {"p50-ms",1,0,P50},{"p95-ms",1,0,P95},{"p99-ms",1,0,P99},{"max-error-rate",1,0,ERROR_RATE},
        {"max-loop-lag-ms",1,0,MAX_LAG},{"timeout",1,0,TIMEOUT},{"cooldown",1,0,COOLDOWN},
        {"fixed",0,0,FIXED},{"duration",1,0,DURATION},{"inspect",0,0,INSPECT},{"json",1,0,JSON},
        {"no-color",0,0,NO_COLOR},{"help",0,0,HELP},{0,0,0,0}};
    opt.url=copy("http://192.168.1.251:30080/"); opt.color=isatty(STDOUT_FILENO) && !getenv("NO_COLOR");
    int c; while((c=getopt_long(argc,argv,"",options,NULL))!=-1) {
        switch(c) {
        case URL: free(opt.url); opt.url=copy(optarg); break;
        case USERS: opt.start=integer(optarg); break; case MAXIMUM: opt.maximum=integer(optarg); break;
        case RESOLUTION: opt.resolution=integer(optarg); break; case CONNECTIONS: opt.connections=integer(optarg); break;
        case RAMP: opt.ramp=number(optarg); break; case WARMUP: opt.warmup=number(optarg); break;
        case WINDOW: opt.window=number(optarg); break; case WINDOWS: opt.windows=integer(optarg); break;
        case FAIL_WINDOWS: opt.fail_windows=integer(optarg); break; case MIN_SAMPLES: opt.min_samples=integer(optarg); break;
        case P50: opt.p50=number(optarg); break; case P95: opt.p95=number(optarg); break; case P99: opt.p99=number(optarg); break;
        case ERROR_RATE: opt.error_rate=number(optarg); break; case MAX_LAG: opt.max_lag=number(optarg); break;
        case TIMEOUT: opt.timeout=number(optarg); break; case COOLDOWN: opt.cooldown=number(optarg); break;
        case FIXED: opt.fixed=true; break; case DURATION: opt.duration=number(optarg); break; case INSPECT: opt.inspect=true; break;
        case JSON: opt.json=optarg; break; case NO_COLOR: opt.color=false; break; case HELP: usage(); return 0;
        default: usage(); return 2;
        }
    }
    if(optind!=argc) die("Unexpected positional arguments");
    if(opt.duration<=0 || opt.timeout<=0 || opt.timeout>600 || opt.window<=0 || opt.p50<=0 || opt.max_lag<=0 ||
       opt.p50>opt.p95 || opt.p95>opt.p99 || opt.error_rate>100 || opt.windows>WINDOW_LIMIT ||
       opt.fail_windows>opt.windows || (!opt.fixed && opt.maximum<opt.start) || (opt.fixed && opt.ramp>=opt.duration) ||
       (long long)(opt.fixed?opt.start:opt.maximum)*opt.connections>1000000) die("Invalid counts, timings, thresholds or too many connections (max 1000000)");
    bin_count=(size_t)ceil(opt.timeout*1000)+10001;
    if(opt.p99>=(double)bin_count-1) die("p99 budget exceeds histogram range; increase timeout or lower budget");
    if(curl_global_init(CURL_GLOBAL_DEFAULT)!=CURLE_OK) die("Cannot initialize libcurl");
    origin=curl_url(); if(!origin || curl_url_set(origin,CURLUPART_URL,opt.url,0)) die("Invalid URL");
    char *path=NULL,*value=NULL;
    if(curl_url_get(origin,CURLUPART_SCHEME,&scheme,0) || (strcmp(scheme,"http") && strcmp(scheme,"https")) ||
       curl_url_get(origin,CURLUPART_HOST,&host,0) || curl_url_get(origin,CURLUPART_PORT,&port,CURLU_DEFAULT_PORT)) die("URL must use HTTP or HTTPS");
    curl_url_get(origin,CURLUPART_PATH,&path,0); if(!path || strcmp(path,"/")) die("URL must be an origin, without subpath"); curl_free(path);
    CURLUPart banned[]={CURLUPART_USER,CURLUPART_PASSWORD,CURLUPART_QUERY,CURLUPART_FRAGMENT};
    for(size_t i=0;i<sizeof(banned)/sizeof(banned[0]);++i) if(curl_url_get(origin,banned[i],&value,0)==CURLUE_OK) { curl_free(value); die("URL cannot contain credentials, query or fragment"); }
    curl_url_get(origin,CURLUPART_URL,&value,0); free(opt.url); opt.url=copy(value); curl_free(value);
    signal(SIGINT,on_signal); signal(SIGTERM,on_signal); signal(SIGPIPE,SIG_IGN);
    printf("%sSYSTEM DESIGN ATLAS | C / libcurl%s\nTarget: %s\nDiscovering current assets...\n",opt.color?"\033[1;36m":"",opt.color?"\033[0m":"",opt.url); fflush(stdout);
    discover();
    uint64_t bytes=0; for(int i=0;i<asset_count;++i) bytes+=assets[i].bytes;
    printf("%d resources, %.2f MiB. HTTP/1.1 + gzip; no cache skips or reading pauses.\n",asset_count,bytes/1048576.0);
    if(opt.inspect) for(int i=0;i<asset_count;++i) printf("%9" PRIu64 "  %s\n",assets[i].bytes,assets[i].path);
    int code=0;
    if(!opt.inspect && !interrupted) {
        printf("%d connections/user | p50/p95/p99 budgets %.0f/%.0f/%.0f ms | errors <= %.4f%%\n",opt.connections,opt.p50,opt.p95,opt.p99,opt.error_rate);
        Stage *stages=alloc(STAGE_LIMIT,sizeof(Stage)); int count=0,users=opt.start,passed=0,failed=0,first=0;
        Verdict verdict=INCONCLUSIVE;
        while(!interrupted && count<STAGE_LIMIT) {
            printf("\nTesting %d users | passing=%d | failing=%d (0 = unknown)\n",users,passed,failed); fflush(stdout);
            Stage s=run_stage(users); stages[count++]=s; verdict=s.verdict;
            if(s.verdict==PASS) { if(users>passed) passed=users; }
            else if(s.verdict==FAIL) { if(!failed || users<failed) failed=users; if(!first) first=users; }
            else break;
            if(opt.fixed) break;
            int next;
            if(!failed) { if(users>=opt.maximum) break; next=users>opt.maximum/2?opt.maximum:users*2; }
            else if(!passed) { if(failed<=1) break; next=failed/2; }
            else { if(failed-passed<=opt.resolution) break; next=passed+(failed-passed)/2; }
            printf("Next: %d users. Cooling down for %.1fs...\n",next,opt.cooldown); fflush(stdout);
            pause_for(opt.cooldown); users=next;
        }
        if(interrupted) verdict=INTERRUPTED;
        else if(verdict!=INCONCLUSIVE && failed) verdict=FAIL;
        stage_log("\nRESULT");
        if(opt.fixed) printf("Fixed test: %s (no concurrency limit inferred).\n",verdict_name(verdict));
        else if(verdict==INCONCLUSIVE || verdict==INTERRUPTED) printf("%s: partial observations, passing=%d, failing=%d. Search not complete.\n",verdict_name(verdict),passed,failed);
        else if(failed && passed) printf("Highest passing: %d | Lowest failing: %d | Gap: %d clients\n",passed,failed,failed-passed);
        else if(failed) puts("Even one client failed; no passing baseline found.");
        else printf("At least %d clients passed; failure not reached.\n",passed);
        puts("Stress clients continuously download; this is not a count of human readers. Check both network and generator limits.");
        save_report(stages,count,verdict,passed,failed,first); free(stages);
        code=verdict==INTERRUPTED?130:verdict==INCONCLUSIVE?2:verdict==FAIL?1:0;
    } else if(interrupted) code=130;
    for(int i=0;i<asset_count;++i) { free(assets[i].url); free(assets[i].path); }
    curl_free(scheme); curl_free(host); curl_free(port); curl_url_cleanup(origin); free(opt.url); curl_global_cleanup();
    return code;
}
