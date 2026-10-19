/** Stop waiting while observing late failures and releasing abort listeners. */
export function withAbort<T>(work: PromiseLike<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return Promise.resolve(work);
  return new Promise<T>((resolve, reject) => {
    const cleanup = () => signal.removeEventListener('abort', aborted);
    const aborted = () => { cleanup(); reject(signal.reason); };
    if (signal.aborted) aborted();
    else signal.addEventListener('abort', aborted, { once: true });
    Promise.resolve(work).then(
      value => { cleanup(); resolve(value); },
      error => { cleanup(); reject(error); },
    );
  });
}
