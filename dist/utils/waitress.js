"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Waitress {
    constructor(validator, timeoutFormatter) {
        this.waiters = new Map();
        this.timeoutFormatter = timeoutFormatter;
        this.validator = validator;
        this.currentID = 0;
    }
    resolve(payload) {
        return this.forEachMatching(payload, waiter => waiter.resolve(payload));
    }
    reject(payload, message) {
        return this.forEachMatching(payload, waiter => waiter.reject(new Error(message)));
    }
    remove(ID) {
        const waiter = this.waiters.get(ID);
        if (waiter) {
            if (!waiter.timedout && waiter.timer) {
                clearTimeout(waiter.timer);
            }
            this.waiters.delete(ID);
        }
    }
    waitFor(matcher, timeout) {
        const ID = this.currentID++;
        const promise = new Promise((resolve, reject) => {
            const object = { matcher, resolve, reject, timedout: false, resolved: false, ID };
            this.waiters.set(ID, object);
        });
        const start = () => {
            const waiter = this.waiters.get(ID);
            if (waiter && !waiter.resolved && !waiter.timer) {
                waiter.timer = setTimeout(() => {
                    const message = this.timeoutFormatter(matcher, timeout);
                    waiter.timedout = true;
                    waiter.reject(new Error(message));
                }, timeout);
            }
            return { promise, ID };
        };
        return { ID, start };
    }
    forEachMatching(payload, action) {
        let foundMatching = false;
        for (const [index, waiter] of this.waiters.entries()) {
            if (waiter.timedout) {
                this.waiters.delete(index);
            }
            else if (this.validator(payload, waiter.matcher)) {
                clearTimeout(waiter.timer);
                waiter.resolved = true;
                this.waiters.delete(index);
                action(waiter);
                foundMatching = true;
            }
        }
        return foundMatching;
    }
}
exports.default = Waitress;
//# sourceMappingURL=waitress.js.map