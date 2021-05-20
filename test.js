// @ts-check

const { Queue } = require(".");

async function main() {
	const queue = Queue({ interval: 1000, concurrency: 2, autoStart: false });

	queue.start();

	queue.add(() => console.log(1));
	queue.add(() => console.log(2));
	queue.add(() => console.log(3));
	queue.add(() => console.log(4));
	queue.add(() => console.log(5));
	queue.add(() => console.log(6));

	console.log("size", queue.size);
	queue.size = 10;
	console.log("size", queue.size);

	console.log(await queue.addAll([() => 7, () => 8, () => 9, () => 10]));
	queue.start();

	queue.on("drain", () => queue.cancel());
}

main();
