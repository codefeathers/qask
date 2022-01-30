type EventCtx = {
	start: {};
	step: { count: number };
	next: { pending: number };
	drain: {};
	pause: {};
	clear: { cancelled: number };
	cancel: { cancelled: number };
};

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;
type Intersect<T> = T extends {} ? UnionToIntersection<T[keyof T]> : never;

type Emitters = Intersect<{
	[Event in keyof EventCtx]: (event: Event, ctx: EventCtx[Event]) => void;
}>;

type Listeners = {
	[Event in keyof EventCtx]: ((ctx: EventCtx[Event]) => void)[];
};

type EventTypes = Intersect<{
	[Event in keyof EventCtx]: (event: Event, listener: Listeners[Event][number]) => void;
}>;

const Event = () => {
	const listeners: Listeners = {
		start: [],
		step: [],
		next: [],
		drain: [],
		pause: [],
		clear: [],
		cancel: [],
	};

	const emit: Emitters = (event: keyof Listeners, ctx: any) => listeners[event].forEach(listener => listener(ctx));

	const on: EventTypes = (event: keyof Listeners, listener: any) => {
		listeners[event].push(listener);
	};

	const off: EventTypes = (event: keyof Listeners, listener) => {
		const idx = listeners[event].findIndex(l => l === listener);
		listeners[event].splice(idx, 1);
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

	const add = <T>(f: () => T = () => Promise.resolve() as unknown as T): Promise<T> => {
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

		if (now.length) emit("step", { count: now.length });
		pending -= now.length;

		await Promise.all(now.map(each => each()));
		emit("next", { pending });
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
		add,
		addAll,
		start,
		pause,
		clear,
		cancel,
		...events,
		get interval() {
			return interval;
		},
		set interval(value: number) {
			interval = value;
		},
		get concurrency() {
			return concurrency;
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
			return !Boolean(__queue.length);
		},
		get isPaused() {
			return Boolean(timer);
		},
		__queue,
	};
};
