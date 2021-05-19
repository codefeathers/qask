const { Queue } = require(".");

const queue = Queue({ interval: 1000, concurrency: 2, autoStart: true });

queue.start();

queue.add(() => console.log(1));
queue.add(() => console.log(2));
queue.add(() => console.log(3));
queue.add(() => console.log(4));
queue.add(() => console.log(5));
queue.add(() => console.log(6));

queue.start();

queue.on("drained", () => queue.cancel());
