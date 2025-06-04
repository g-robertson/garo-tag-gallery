class Page {
    #id;
    #name;
    #type;
    
    constructor({id, name, type}) {
        if (typeof id !== "number" || typeof name !== "string" || typeof type !== "number") {
            throw "Service has invalid property";
        }
        
        this.#id = id;
        this.#name = name;
        this.#type = type;
    }

    get id() {
        return this.#id;
    }

    get name() {
        return this.#name;
    }

    get type() {
        return this.#type;
    }
}