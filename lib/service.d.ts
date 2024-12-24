import { Low } from 'lowdb';
export type Item = Record<string, unknown>;
export type Data = Record<string, Item[] | Item>;
export declare function isItem(obj: unknown): obj is Item;
export declare function isData(obj: unknown): obj is Record<string, Item[]>;
export type PaginatedItems = {
    first: number;
    prev: number | null;
    next: number | null;
    last: number;
    pages: number;
    items: number;
    data: Item[];
};
export declare class Service {
    #private;
    constructor(db: Low<Data>);
    has(name: string): boolean;
    findById(name: string, id: string, query: {
        _embed?: string[] | string;
    }): Item | undefined;
    find(name: string, query?: {
        [key: string]: unknown;
        _embed?: string | string[];
        _sort?: string;
        _start?: number;
        _end?: number;
        _limit?: number;
        _page?: number;
        _per_page?: number;
    }): Item[] | PaginatedItems | Item | undefined;
    create(name: string, data?: Omit<Item, 'id'>): Promise<Item | undefined>;
    update(name: string, body?: Item): Promise<Item | undefined>;
    patch(name: string, body?: Item): Promise<Item | undefined>;
    updateById(name: string, id: string, body?: Item): Promise<Item | undefined>;
    patchById(name: string, id: string, body?: Item): Promise<Item | undefined>;
    destroyById(name: string, id: string, dependent?: string | string[]): Promise<Item | undefined>;
}
