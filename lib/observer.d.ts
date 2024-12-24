import { Adapter } from 'lowdb';
export declare class Observer<T> {
    #private;
    onReadStart: () => void;
    onReadEnd: (data: T | null) => void;
    onWriteStart: () => void;
    onWriteEnd: () => void;
    constructor(adapter: Adapter<T>);
    read(): Promise<T | null>;
    write(arg: T): Promise<void>;
}
