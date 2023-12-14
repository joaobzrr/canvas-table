export function throttle(callback: (...args: any[]) => void, delay: number) {
  let shouldWait = false;
  return (...args: any[]) => {
    if (shouldWait) return;

    callback(...args);
    shouldWait = true;
    setTimeout(() => {
      shouldWait = false;
    }, delay);
  };
}
