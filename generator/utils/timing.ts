/**
 * @summary sleeps for a certain number of seconds
 * @param seconds seconds to sleep for
 */
export const sleep = (seconds: number) => new Promise((r) => setTimeout(r, seconds * 1e3));