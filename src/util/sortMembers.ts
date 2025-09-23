const sortMembers = (a: string, b: string) => {
  const [x, y] = [String(a), String(b)].sort((m, n) => (m < n ? -1 : 1));
  return [x, y];
};
export default sortMembers;
