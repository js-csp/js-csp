## Go
Ports of Go examples from these 2 links:
- http://talks.golang.org/2012/concurrency.slide
- http://talks.golang.org/2013/advconc.slide

Run like this (from project's root directory):
```bash
node --harmony examples/go/pingpong
```

## Web
Compile first by running
```bash
gulp bundle:browser
```

The Firebase example needs a real [Firebase](https://www.firebase.com) url, and works only in Firefox (as it uses Javascript features not yet available in other browsers).
