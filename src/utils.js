export const debounce = (fn, delay) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
};

export const classnames = (...classes) => {
  return classes.filter(Boolean).join(" ");
};
