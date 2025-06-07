## [1.0.7](https://github.com/DankTechnologies/Podds/compare/v1.0.6...v1.0.7) (2025-06-07)


### Bug Fixes

* **search:** search local episodes as well as remote ([#7](https://github.com/DankTechnologies/Podds/issues/7)) ([57b6562](https://github.com/DankTechnologies/Podds/commit/57b65621adc27c19bdd5f3b49eb3f493ea0c7bab))

## [1.0.6](https://github.com/DankTechnologies/Podds/compare/v1.0.5...v1.0.6) (2025-06-07)


### Bug Fixes

* **playlist:** go back to earlier approach, most perf fixes came from EpisodeList tuning anyways ([fb846ea](https://github.com/DankTechnologies/Podds/commit/fb846eac3bc0998c705bdb9a6ab3b68b5196c924))

## [1.0.5](https://github.com/DankTechnologies/Podds/compare/v1.0.4...v1.0.5) (2025-06-07)


### Bug Fixes

* Update deps, perf tuning, cleanup ([#6](https://github.com/DankTechnologies/Podds/issues/6)) ([47a9f86](https://github.com/DankTechnologies/Podds/commit/47a9f86cccdb8991fa2055311c06ae234e138b8c))

## [1.0.4](https://github.com/DankTechnologies/Podds/compare/v1.0.3...v1.0.4) (2025-06-05)


### Bug Fixes

* **search:** tighten up search term effect and FeedList props to avoid unnecessary rerenders ([b61d139](https://github.com/DankTechnologies/Podds/commit/b61d13924b7775e0617c86bf88f7d56cd8a8b932))

## [1.0.3](https://github.com/DankTechnologies/Podds/compare/v1.0.2...v1.0.3) (2025-06-05)


### Bug Fixes

* improve node CORS proxy, general polish ([#5](https://github.com/DankTechnologies/Podds/issues/5)) ([5b763e3](https://github.com/DankTechnologies/Podds/commit/5b763e39c53346c292d2b0010e9d07cbefd1d245))

## [1.0.2](https://github.com/DankTechnologies/Podds/compare/v1.0.1...v1.0.2) (2025-05-30)


### Bug Fixes

* Add html meta tags and png logo, fix description ([#4](https://github.com/DankTechnologies/Podds/issues/4)) ([06ab283](https://github.com/DankTechnologies/Podds/commit/06ab2837b3eed267f1e5422cb9fc0de67e70179d))

## [1.0.1](https://github.com/DankTechnologies/Podds/compare/v1.0.0...v1.0.1) (2025-05-29)


### Bug Fixes

* **export:** limit to subscribed feeds ([af5bb63](https://github.com/DankTechnologies/Podds/commit/af5bb63971e10d38a327da75a15af5eb4995a561))

## [1.3.10](https://github.com/DankTechnologies/Podds/compare/v1.3.9...v1.3.10) (2025-05-29)


### Bug Fixes

* **share:** hide image when just podcast shared ([b2a70c9](https://github.com/DankTechnologies/Podds/commit/b2a70c97e6ca8fedb82b2e4b9aed33bb8e8a0e8e))

## [1.3.9](https://github.com/DankTechnologies/Podds/compare/v1.3.8...v1.3.9) (2025-05-29)


### Bug Fixes

* **cors-node:** retain Content-Length header from upstream when proxying requests ([d171c8a](https://github.com/DankTechnologies/Podds/commit/d171c8a70aa484b67bdb5910d0f2a0a57e04aa76))
* **share:** fix bugs with custom CORS proxies and share links ([485af92](https://github.com/DankTechnologies/Podds/commit/485af92a50510d991f4aa30876263a5a761590f3))

## [1.3.8](https://github.com/DankTechnologies/Podds/compare/v1.3.7...v1.3.8) (2025-05-29)


### Bug Fixes

* **share:** await feed add so icon gets cached before playback starts ([f57c5ec](https://github.com/DankTechnologies/Podds/commit/f57c5ec55522bcde2c120752820d0824a4c8b863))

## [1.3.7](https://github.com/DankTechnologies/Podds/compare/v1.3.6...v1.3.7) (2025-05-29)


### Bug Fixes

* better error handling at startup ([50350ad](https://github.com/DankTechnologies/Podds/commit/50350adba8647d1950d118d9bd9f7d11db4e3cbc))

## [1.3.6](https://github.com/DankTechnologies/Podds/compare/v1.3.5...v1.3.6) (2025-05-29)


### Bug Fixes

* **perf:** use cached images instead of base64 data images, fix service worker in dev ([74fde8d](https://github.com/DankTechnologies/Podds/commit/74fde8dee9f9ccb422d5bc72547badb7d8f316a2))

## [1.3.5](https://github.com/DankTechnologies/Podds/compare/v1.3.4...v1.3.5) (2025-05-29)


### Bug Fixes

* **perf:** more requestIdleCallback on background stuff ([8f96656](https://github.com/DankTechnologies/Podds/commit/8f96656ceaddc8b26878817ba118f0260c1362eb))

## [1.3.4](https://github.com/DankTechnologies/Podds/compare/v1.3.3...v1.3.4) (2025-05-29)


### Bug Fixes

* **EpisodeService:** clear downloaded flag as part of retention policy ([ae14a94](https://github.com/DankTechnologies/Podds/commit/ae14a940287df8e44b4e8a4abefb3afe7a8a0173))

## [1.3.3](https://github.com/DankTechnologies/Podds/compare/v1.3.2...v1.3.3) (2025-05-29)


### Bug Fixes

* **EpisodeList:** better scroll transitions when focusing episode ([1db83eb](https://github.com/DankTechnologies/Podds/commit/1db83eb39f43339d57e82b92a55f73720dad1153))
* **perf:** use requestIdleCallback when inserting episodes and updating feeds during sync ([b459223](https://github.com/DankTechnologies/Podds/commit/b459223bc70cccc8ad7a91abfff95d6a47739a42))

## [1.3.2](https://github.com/DankTechnologies/Podds/compare/v1.3.1...v1.3.2) (2025-05-29)


### Bug Fixes

* **cors:** case-insensitive origin check ([163ff89](https://github.com/DankTechnologies/Podds/commit/163ff894ac3e4058be3dd1732f935f9b577244f6))

## [1.3.1](https://github.com/DankTechnologies/Podds/compare/v1.3.0...v1.3.1) (2025-05-29)


### Bug Fixes

* **cors:** origin allowlist, lan denylist, compression agreement ([ab09a86](https://github.com/DankTechnologies/Podds/commit/ab09a862f4fe1cf1aecc9dd866f8b9478dd34fb9))

# [1.3.0](https://github.com/DankTechnologies/Podds/compare/v1.2.5...v1.3.0) (2025-05-28)


### Features

* include custom CORS proxies in share links ([ee93f65](https://github.com/DankTechnologies/Podds/commit/ee93f65d318602dbaac9f66f9d6742c45e221f97))

## [1.2.5](https://github.com/DankTechnologies/Podds/compare/v1.2.4...v1.2.5) (2025-05-28)


### Bug Fixes

* CSS fixes ([ebd1106](https://github.com/DankTechnologies/Podds/commit/ebd11062207f143ccefe8b6f3439690263d5b4f4))

## [1.2.4](https://github.com/DankTechnologies/Podds/compare/v1.2.3...v1.2.4) (2025-05-27)


### Bug Fixes

* **itunes:** fallback to CORS proxy if itunes returns OK but no results ([27a56cb](https://github.com/DankTechnologies/Podds/commit/27a56cb829e74f93d83a6728e11aef74a204a41c))

## [1.2.3](https://github.com/DankTechnologies/Podds/compare/v1.2.2...v1.2.3) (2025-05-27)


### Bug Fixes

* add link ([a696f32](https://github.com/DankTechnologies/Podds/commit/a696f32d5868e7e272990249e7b60c2cb13492b5))

## [1.2.2](https://github.com/DankTechnologies/Podds/compare/v1.2.1...v1.2.2) (2025-05-27)


### Bug Fixes

* add link ([38b84b8](https://github.com/DankTechnologies/Podds/commit/38b84b8c5769aa3a1a3b8fc3a2f0caaca3bab07d))

## [1.2.1](https://github.com/DankTechnologies/Podds/compare/v1.2.0...v1.2.1) (2025-05-27)


### Bug Fixes

* remove extra v in version template ([f5c72b2](https://github.com/DankTechnologies/Podds/commit/f5c72b28170aefe1a10a7b4a1d80207b586cdd86))

# [1.2.0](https://github.com/DankTechnologies/Podds/compare/v1.1.0...v1.2.0) (2025-05-27)


### Features

* add automatic release configuration ([fe16320](https://github.com/DankTechnologies/Podds/commit/fe16320777f997ab5e33406afd2048576e97e6eb))

# [1.1.0](https://github.com/DankTechnologies/Podds/compare/v1.0.0...v1.1.0) (2025-05-27)


### Features

* test automatic release ([f282f1b](https://github.com/DankTechnologies/Podds/commit/f282f1bdffa3959caa57459bf6e6fd146d8c835d))

# 1.0.0 (2025-05-27)


### Bug Fixes

* versioning attempt one ([0a9650d](https://github.com/DankTechnologies/Podds/commit/0a9650db86861cd14b787662b82bf94399b58b8f))


### Features

* custom CORS proxy + reset to default ([031a5b8](https://github.com/DankTechnologies/Podds/commit/031a5b8034a6833410b5914bbd446dfc115d46f1))

# 1.0.0 (2025-05-27)


### Bug Fixes

* versioning attempt one ([0a9650d](https://github.com/DankTechnologies/Podds/commit/0a9650db86861cd14b787662b82bf94399b58b8f))
