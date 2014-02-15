# Changes to js-csp

## 0.1.3

- CHANGED: More reliable `mocha` test helpers.
- FIXED: Delayed puts now correctly returns `true` on succeed.

## 0.1.2

- ADDED: Priority and default options for `alts`.
- ADDED: Tests.
- ADDED: Examples.
- ADDED: Preliminary documentation.
- REMOVED: `stop`.
- CHANGED: Small optimization for `alts`.
- CHANGED: camelCase for public APIs.
- FIXED: `yield`ing normal values is now allowed.
- FIXED: Returning value from goroutine is now allowed.
- FIXED: Closing channels now does not hang pending puts.

## 0.1.1

- FIXED: Call stack no longer grows unboundedly when results are immediately available.

## 0.1.0

- Initial release.
