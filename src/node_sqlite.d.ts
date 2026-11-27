// Node 26.8 binds a boolean (as 0/1) and 26.10 `undefined` (as NULL); @types/node 26.6 does
// not declare it yet. Remove this file once it does.
import "node:sqlite";

declare module "node:sqlite" {
  type BindValue = SQLInputValue | boolean | undefined;

  interface StatementSync {
    all(...anonymousParameters: BindValue[]): Record<string, SQLOutputValue>[];
    get(...anonymousParameters: BindValue[]): Record<string, SQLOutputValue> | undefined;
    run(...anonymousParameters: BindValue[]): StatementResultingChanges;
  }
}
