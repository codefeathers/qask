# qask

Tasks queued to run in intervals. Useful for ratelimiting API requests and the such.

## Usage

```TypeScript
import { Queue } from "qask";

async function main () {

	const queue = Queue({ interval: 1000, concurrency: 1, autoStart: true });

	// elsewhere
	const companies = await queue.add(
		() => fetch(`https://example.com/api/v1/companies`));
	
	// elsewhere
	const users = await queue.add(
		() => fetch(`https://example.com/api/v1/users`));
	
	// elsewhere
	const clicks = await queue.add(
		() => fetch(`https://example.com/api/v1/clicks`));
	
	// elsewhere
	const reads = await queue.add(
		() => fetch(`https://example.com/api/v1/reads`));

	// All these functions are queued to run at a maximum of 1 per second
}

main();
```

## API

### Queue ({ interval, concurrency, autoStart })

Queue factory. Creates a new queue instance.

#### Params

- **interval** _(number, default: 0)_ milliseconds to wait after each cycle
- **concurrency** _(number, default: 1)_ number of items to process each cycle
- **autoStart** _(boolean, default: false)_ whether to start queue immediately on first push

### queue.add (fn)

Add a function to the queue and returns a Promise of return type of fn. Call without params to create a wait function that will resolve when picked from queue if you simply want to lock and take control.

> **Note**: if your function throws an error, `.add()` will reject, but queue will continue to process. Remember to handle your errors with `try await / catch` or `.catch()`.

### queue.addAll ([...fns])

Adds all functions to queue. If any of the functions throw or reject, `.addAll()` will reject. However, if all functions resolve, the returned Promise will resolve to an array of values. All other semantics are identical to `.add()`.

### queue.start ()

Starts the queue. No-op if queue is already running.

### queue.pause ()

Pauses queue execution. Any processes already started will continue, new tasks will not be picked until `.start()` is called. No-op if queue is already paused.

### queue.clear ()

Clears the queue. Queue is not paused, and will continue to try and pick tasks.

### queue.cancel ()

Clears the queue and stops taking tasks. Any processes already started will continue.

### queue.on (event, listener)

Adds an eventlistener to specified event.

#### Params

- **event** _(string)_ One of `"start"`, `"next"`, `"drain"`, `"pause"`, `"clear"`, `"cancel"`
- **listener** _(function)_ Takes a context object, refer to TS types.

### queue.off (event, listener)

Removes an eventlistener to specified event.

#### Params

- **event** _(string)_ One of `"start"`, `"next"`, `"drain"`, `"pause"`, `"clear"`, `"cancel"`
- **listener** _(function)_ Takes a context object, refer to TS types.

### queue.interval

> _(number)_

Interval passed via [`Queue`](#queue--interval-concurrency-autostart-) factory. Assign to this prop to modify.

### queue.concurrency

> _(number)_

Concurrency passed via [`Queue`](#queue--interval-concurrency-autostart-) factory. Assign to this prop to modify.

### queue.size _(getter)_

> _(number)_

Gets the remaining size of the queue at any point. Cannot be assigned to.

### queue.pending _(getter)_

> _(number)_

Gets the tasks that were started from the queue but pending completion. Cannot be assigned to.

### queue.hasStarted _(getter)_

> _(boolean)_

Returns true if queue has started. Cannot be assigned to.

### queue.isEmpty _(getter)_

> _(boolean)_

Returns true if queue is empty. Cannot be assigned to.

### queue.isPaused _(getter)_

> _(boolean)_

Returns true if queue is paused. Cannot be assigned to.

## Credits

Originally started as a gist based on a question by [@darvesh](https://github.com/darvesh) with inputs from [@TRGWII](https://github.com/TRGWII).
