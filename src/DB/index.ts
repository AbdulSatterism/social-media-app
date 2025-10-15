import colors from 'colors';
import { User } from '../app/modules/user/user.model';
import config from '../config';
import { USER_ROLES } from '../enums/user';
import { logger } from '../shared/logger';

const superUser = {
  name: 'RE SOCIAL MEDIA',
  role: USER_ROLES.ADMIN,
  email: config.admin.email,
  password: config.admin.password,
  phone: '14524578',
  verified: true,
  gender: 'FEMALE',
};

const seedAdmin = async () => {
  try {
    const isExistSuperAdmin = await User.findOne({ role: USER_ROLES.ADMIN });

    if (!isExistSuperAdmin) {
      await User.create(superUser);
      logger.info(colors.green('✔ admin created successfully!'));
    } else {
      logger.info(colors.yellow('✔ admin already exist!'));
    }
  } catch (error) {
    logger.error(colors.red('❌ admin not created!'), error);
  }
};

export default seedAdmin;
