import { LocalTagService } from "./services/local-tag-service";
import { Service } from "./services/service";
import { TagService } from "./services/tag-service";

export class User {
    /** @type {Page[]} */
    #pages;
    /** @type {Service[]} */
    #services;

    constructor(json) {
        this.#pages = json['pages'] ?? [];
        this.#services = json['services'] ?? [];
    }

    /** @returns {TagService[]} */
    get tagServices() {
        
        return this.#services.filter(service => (service instanceof LocalTagService));
    }

    static EMPTY_USER = new User({});
}