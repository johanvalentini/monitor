'use strict';

const os = require('os-utils');
const ps = require('current-processes');
const koa = require('koa');

// (Very) simple API access key
const secret = "123";

// Api
let api = koa();


class Sensor {
	
	constructor(name) {
		this.data = {
			name: name,
			value: 0,
		};
	}

	poll() {
		this.refresh();
		return this.data;
	}
}
class Processes extends Sensor {

	constructor() {
		super('processes');
	}

	refresh() {
		ps.get((err, processes) => {
			this.data.value = processes.sort((a, b) => { return a.cpu < b.cpu ? 1 : -1 }).splice(0,15);
		});
		
	}
}

class Memory extends Sensor {

	constructor() {
		super('memory');
	}

	refresh() {
		this.data.value = (Math.floor(os.freememPercentage() * 100));
	}
	
}
class CPU extends Sensor {

	constructor() {
		super('cpu');
	}

	refresh() {
		os.cpuUsage((v) => {
			this.data.value = (Math.floor(v * 100));
		});
	}

}

class Monitor {

	constructor(things) {
		this.things = things;
		this.state = {};
		
	}

	updateState() {
		this.things.forEach((thing) => {
			this.state[thing.data.name] = thing.poll().value;
		});
	}

	getState() {
		return this.state;
	}

	start() {
		setInterval(() => {
			this.updateState();
		}, 1000)
	}

}

api.use(function *(next) {
	
	if(this.method == 'GET' && this.url.indexOf(secret) > -1){
		yield next;	
	} else {
		this.throw(401, 'Denied!');
	}
	
})

api.use(function *(){
	this.set({
		"Access-Control-Allow-Origin": "*",
	});
	this.body = monitor.getState();
})

// Monitor process
let monitor = new Monitor([new CPU(),new Memory(), new Processes()]);
monitor.start();

api.listen(3000);