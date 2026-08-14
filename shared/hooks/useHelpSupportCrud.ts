import { useNavigation } from '@/shared/contextapi/navigationContext';
import { CrudAction, HelpSupportTabKey } from '@/shared/types/permissions';
import toast from 'react-hot-toast';

export function useHelpSupportCrud(tab: HelpSupportTabKey) {
  const { hasCrudPermission } = useNavigation();
  const path = `Help & Support.${tab}`;

  const check = (action: CrudAction) => hasCrudPermission(path, action);

  const guard = (action: CrudAction) => {
    if (!check(action)) {
      toast.error(`You do not have permission to ${action} ${tab.toLowerCase()}.`);
      return false;
    }
    return true;
  };

  return {
    tab,
    path,
    canRead: check('read'),
    canCreate: check('create'),
    canUpdate: check('update'),
    canDelete: check('delete'),
    hasCrudPermission: check,
    guardCreate: () => guard('create'),
    guardUpdate: () => guard('update'),
    guardDelete: () => guard('delete'),
  };
}
