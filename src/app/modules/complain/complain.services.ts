import { Complain } from './complain.model';

const createComplain = async (repoter: string, repoted: string) => {
  const payload = { repoter, repoted };
  const result = await Complain.create(payload);
  return result;
};

export const ComplainService = {
  createComplain,
};
