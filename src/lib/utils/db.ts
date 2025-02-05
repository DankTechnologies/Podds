// import type { Collection, Selector } from '@signaldb/core';

// // MongoDB-style query operators
// type QueryOperators<T> = {
// 	$eq?: T;
// 	$gt?: T;
// 	$gte?: T;
// 	$lt?: T;
// 	$lte?: T;
// 	$ne?: T;
// 	$in?: T[];
// 	$nin?: T[];
// };

// type QueryValue<T> = T | QueryOperators<T>;

// export type Query<T> = {
// 	[P in keyof T]?: QueryValue<T[P]> | { [key: string]: QueryValue<T[P]> };
// } & {
// 	$or?: Query<T>[];
// 	$and?: Query<T>[];
// };

// export function useDocument<T extends { id: any }>(
// 	collection: Collection<T>,
// 	query: Selector<T>
// ): T | null {
// 	let doc = $state.raw<T | null>(null);

// 	$effect(() => {
// 		const cursor = collection.find(query);
// 		doc = cursor.fetch()[0] || null;
// 		return () => cursor.cleanup();
// 	});

// 	return doc;
// }
