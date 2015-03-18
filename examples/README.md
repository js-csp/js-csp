## Go ##

Ports of Go examples from these 2 links:
- http://talks.golang.org/2012/concurrency.slide
- http://talks.golang.org/2013/advconc.slide

Run like this (from project's root directory):
```bash
node --harmony examples/go/pingpong
```

## Web ##

Compile first by running
```bash
gulp bundle:browser
```

- [Mouse Events](./web/mouse-events.html): Combines mouse events and timeouts to detect when the mouse stops moving.

- [Throttled Search](./web/throttled-search.html): A simple search-as-you-type box that does not try to send too many requests unnecessarily.

- [Firebase](./web/firebase.html): Ported from http://blog.cryptoguru.com/2014/11/frp-using-rxjs-and-firebase.html. This needs a real [Firebase](https://www.firebase.com) url, and works only in Firefox (as it uses Javascript features not yet available in other browsers).

- [Drag and Drop](./web/drag-n-drop.html): Drags an image around. Ported from [RxJS](https://github.com/Reactive-Extensions/RxJS/tree/master/examples/dragndrop).
