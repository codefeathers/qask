type Listener<Ctx extends {} = {}> = (ctx: Ctx) => void;

type EmitFn<Event extends string, Ctx> = (event: Event, ctx: Ctx) => void;

type Emitters = EmitFn<"start", {}> &
	EmitFn<"next", {}> &
	EmitFn<"drain", {}> &
	EmitFn<"pause", {}> &
	EmitFn<"clear", { cancelled: number }> &
	EmitFn<"cancel", { cancelled: number }>;

type EventFn<Event extends string, Ctx> = (
	event: Event,
	listener: Listener<Ctx>,
) => void;

type EventTypes = EventFn<"start", {}> &
	EventFn<"next", { count: number }> &
	EventFn<"drain", {}> &
	EventFn<"pause", {}> &
	EventFn<"clear", { cancelled: number }> &
	EventFn<"cancel", { cancelled: number }>;

type Listeners = {
	start: Listener<{}>[];
	next: Listener<{ count: number }>[];
	drain: Listener<{}>[];
	pause: Listener<{}>[];
	clear: Listener<{ cancelled: number }>[];
	cancel: Listener<{ cancelled: number }>[];
};

const Event = () => {
	const listeners: Listeners = {
		start: [],
		next: [],
		drain: [],
		pause: [],
		clear: [],
		cancel: [],
	};

	const emit: Emitters = (event: keyof Listeners, ctx: any) =>
		listeners[event].forEach((listener: Listener<any>) => listener(ctx));

	const on: EventTypes = (event: keyof Listeners, listener: any) => {
		listeners[event].push(listener);
	};

	const off: EventTypes = (event: keyof Listeners, listener: any) => {
		if (listeners[event]) {
			const idx = listeners[event].findIndex(
				(l: Listener<any>) => l === listener,
			);
			listeners[event].splice(idx);
		}
	};

	return { emit, on, off };
};

export const Queue = ({
	interval = 0,
	concurrency = 1,
	autoStart = false,
}: {
	interval?: number;
	concurrency?: number;
	autoStart?: boolean;
} = {}) => {
	const __queue: (() => Promise<void>)[] = [];
	const { emit, ...events } = Event();

	let toStart = true;

	const add = <T>(
		f: () => T = () => Promise.resolve() as unknown as T,
	): Promise<T> => {
		return new Promise((resolve, reject) => {
			__queue.push(async () => {
				try {
					const v = await f();
					resolve(v);
				} catch (err) {
					reject(err);
				}
			});

			if (toStart && autoStart) {
				toStart = false;
				start();
			}
		});
	};

	const addAll = <F extends () => unknown>(fs: F[]) => Promise.all(fs.map(add));

	let timer: null | ReturnType<typeof setTimeout> = null;

	let pending = 0;

	const start = async () => {
		// prevent multiple start()
		if (pending) return;
		if (toStart && !__queue.length) {
			// we'll start when push() is called
			if (autoStart) return;
			// treat as autostart if start() called immediately after init
			// queue is empty
			if (!autoStart) {
				autoStart = true;
				return;
			}
		}

		if (toStart) emit("start", {});
		toStart = false;

		const now = __queue.splice(0, concurrency);
		pending = now.length;

		if (pending) emit("next", { count: pending });
		await Promise.all(now.map(each => each()));
		pending = 0;

		timer = setTimeout(start, interval);

		if (!__queue.length) emit("drain", {});
	};

	let cancelled = false;

	const pause = () => {
		if (timer) {
			clearTimeout(timer);
			timer = null;

			if (!cancelled) emit("pause", {});
		}
	};

	const clear = () => {
		const len = __queue.length;

		__queue.splice(0);

		emit("clear", { cancelled: len });
	};

	const cancel = () => {
		const len = __queue.length;
		cancelled = true;

		pause();
		clear();

		toStart = true;

		emit("cancel", { cancelled: len });
	};

	return {
		...events,
		add,
		addAll,
		start,
		pause,
		cancel,
		clear,
		set interval(value: number) {
			interval = value;
		},
		set concurrency(value: number) {
			concurrency = value;
		},
		get size() {
			return __queue.length;
		},
		get pending() {
			return pending;
		},
		get hasStarted() {
			return !toStart;
		},
		get isEmpty() {
			return Boolean(__queue.length);
		},
		get isPaused() {
			return Boolean(timer);
		},
		__queue,
	};
};
