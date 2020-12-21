# AES67 Monitor App
Cross plattform AES67 monitoring app. It still is in early development.

Here is a screenshot of how the main window of the app looks currently:
![Screenshot](doc/screenshot.png "Screenshot")


## Installation
```
git clone https://github.com/philhartung/aes67-monitor.git
cd aes67-monitor
npm install
```
The app should then be installed.  Audify (audio backend used) prebuilds are available for most major platforms and Node versions. If you need to build Audify from source, see https://github.com/almogh52/audify#requirements-for-source-build.

After installation you an start the app with `npm start`.

## Building
To build a binary for your system, first install the app and then run:
```
npm run build
```
This will create a folder for your platform and CPU architecture, containing the binary.

## License and copyright notice
This repository contains code under the MIT License from [twbs/bootstrap](https://github.com/twbs/bootstrap).
