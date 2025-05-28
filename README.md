
<h1 align="center">Podds</h1>
<p align="center">
  <img src="static/podds.svg" alt="Podds logo" height="160" />
</p>
<p align="center">
  <a href="https://podds.io">podcasts, simple and free</a>
</p>

---

## Table of Contents

- [What is Podds?](#what-is-podds)
- [Videos and Screenshots](#videos-and-screenshots)
- [Tech Stack](#tech-stack)
- [CORS Proxies](#cors-proxies)
  - [Default Proxies](#default-proxies)
  - [Bring Your Own Proxy](#bring-your-own-proxy)
  - [The Cloudflare Worker Way](#the-cloudflare-worker-way)
  - [The Self-Hosted Way](#the-self-hosted-way)
- [Inspired By](#inspired-by)
## What is Podds?

[Podds](https://podds.io) is a local-first podcast web app geared towards simplicity, speed, and sharing. I built it as a weekend project that took 6 months, as is tradition.

There's no ads, no signups or accounts, no app stores or gatekeepers, no SaaS or costs.  Instead, podds runs on your device and uses the open web for easy distribution.  

You can [import](https://podds.io/settings?section=basic#import) podcasts from another app or use the [search](https://podds.io/search) page to find both podcasts and episodes.  Podds takes care of the rest, finding new episodes, handling downloads and playback, saving searches, chapter support, and so on.  All of your data stays on your device.

**Try it out at [podds.io](https://podds.io)**

## Videos and Screenshots

<video src="https://github.com/user-attachments/assets/32f7ff84-c52a-4286-80e6-474973dac334" width="30%"></video>
<img src="https://github.com/user-attachments/assets/9dc09ff0-678b-48d8-bcae-397399b45bda" width="30%"></img>
<img src="https://github.com/user-attachments/assets/43466f00-302c-4e9c-8205-e562b71f4757" width="30%"></img>
<img src="https://github.com/user-attachments/assets/f2fbf8e0-825e-48a5-939c-a0f7665ded25" width="30%"></img>

## Tech Stack

Data

* [SignalDB](https://signaldb.js.org/)
* [fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser)
* [CORS Proxies](https://httptoolkit.com/blog/cors-proxies/)
* [iTunes Search API](https://performance-partners.apple.com/search-api)

UI

* [Svelte](https://svelte.dev/)
* [Svelte Bottom Sheet](https://github.com/AuxiDev/svelte-bottom-sheet)
* [Lucide Icons](https://lucide.dev/)
* [Pattern Monster](https://pattern.monster/)

## CORS Proxies

> CORS proxies help web apps get equal-footing with native apps (Android, iOS), especially when 3rd-party data needs to be fetched

Podds is configured with two [CORS proxies](https://httptoolkit.com/blog/cors-proxies/) - a primary and (optional) backup.  They help podds sync podcast feeds, download artwork and audio files, and help with iTunes searches since it gets crabby sometimes.  

Without CORS proxies, the browser will block network requests to other servers unless they allow CORS.  When you write server-side web software, CORS is typically disabled by default, and you have to opt-in.  In practice, most podcast servers do not opt-into CORS.  

### Default Proxies

By default, podds ships with CORS proxies that I manage.  The primary is a [Cloudflare Worker](cors-proxies/cloudflare/worker.js) and the backup is in [Node](cors-proxies/node/server.js) and self-hosted.  

You're welcome to use my proxies!  I will try to keep the lights on, one way or another, and adapt + improve the proxies as I go.

### Bring Your Own Proxy

You can create and use your own CORS proxies with podds, which I recommend for several reasons

🔒 **[Privacy](https://www.inkandswitch.com/essay/local-first/#6-security-and-privacy-by-default)** => when you use a public CORS proxy, you are trusting its owner, because they sit between you and the target server.  Instead of _should I trust DanK_, the better question is _how can I not have to trust DanK in the first place?_, and the answer is to run your own CORS proxy

📜 **[The Long Now](https://www.inkandswitch.com/essay/local-first/#5-the-long-now)** => maybe my CORS proxies hit quotas or fall over, maybe free tiers go away, maybe I'm hit by a bus.  None of that should prevent you from continuing to use podds

🚲 **It's Easy** => the [Cloudflare Worker](#the-cloudflare-worker-way) way takes a few minutes.  Create account, copy+paste the worker code, configure URL in the podds settings.  Done.

### The Cloudflare Worker Way

> zero-cost, no credit card, email verification

Create a [Cloudflare account](https://dash.cloudflare.com/sign-up), then create + deploy a worker with the _Hello World_ template. Click **Edit Code** and paste in this [worker.js](/cors-proxies/cloudflare/worker.js) script.

The free tier quota is 100k requests per day, as of April 2025. It should suffice for dozens to hundreds of users depending upon number of subscribed feeds and overall podds usage throughout a day.  

### The Self-Hosted Way

This repo contains an equivalent [NodeJS app](/cors-proxies/node/server.js) and [Dockerfile](/cors-proxies/node/Dockerfile). Plumbing out to the internet is left as an exercise for the self-hoster.  

Some good resources

- [awesome-selfhosted](https://github.com/awesome-selfhosted/awesome-selfhosted)
- [r/selfhosted](https://www.reddit.com/r/selfhosted/)

## Inspired By

- [Maggie Appleton - Home-Cooked Software and Barefoot Developers](https://maggieappleton.com/home-cooked-software)
- [Open Web Advocacy - Walled Gardens Report](https://open-web-advocacy.org/walled-gardens-report/)
- [Johannes Schickling - local-first podcast](https://www.localfirst.fm/)
- [SLC - Simple, Lovable, Complete](https://longform.asmartbear.com/slc/)
- [Linear](https://linear.app)
