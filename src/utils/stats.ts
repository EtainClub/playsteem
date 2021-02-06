export const getNumberStat = (count: number) => {
  let newCount = count.toString();
  if (count < 1000) {
    newCount = newCount;
  } else if (count < 1000000) {
    newCount = newCount.slice(0, newCount.length - 3) + 'K';
  } else {
    newCount = newCount.slice(0, newCount.length - 6) + 'M';
  }
  return newCount;
};

export const putComma = (x) => {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};
