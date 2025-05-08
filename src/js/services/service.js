export class Service {
    #id;
    #name;
    
    constructor({id, name}) {
        if (typeof id !== "number" || typeof name !== "string") {
            throw "Service has invalid property";
        }
        
        this.#id = id;
        this.#name = name;
    }

    get id() {
        return this.#id;
    }

    get name() {
        return this.#name;
    }
}