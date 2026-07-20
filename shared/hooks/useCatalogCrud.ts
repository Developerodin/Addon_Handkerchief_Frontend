import { useNavigation } from '@/shared/contextapi/navigationContext';
import { CATALOG_PATH_TO_MODULE, CrudAction } from '@/shared/types/permissions';
import toast from 'react-hot-toast';

export type CatalogSegment = keyof typeof CATALOG_PATH_TO_MODULE;

export function useCatalogCrud(segment: CatalogSegment) {
  const { hasCrudPermission } = useNavigation();
  const module = CATALOG_PATH_TO_MODULE[segment];
  const path = `Catalog.${module}`;

  const check = (action: CrudAction) => hasCrudPermission(path, action);

  const guard = (action: CrudAction) => {
    if (!check(action)) {
      toast.error(`You do not have permission to ${action} ${module.toLowerCase()}.`);
      return false;
    }
    return true;
  };

  return {
    module,
    path,
    canRead: check('read'),
    canCreate: check('create'),
    canUpdate: check('update'),
    canDelete: check('delete'),
    canImport: check('create') || check('update'),
    hasCrudPermission: check,
    guardCreate: () => guard('create'),
    guardUpdate: () => guard('update'),
    guardDelete: () => guard('delete'),
  };
}
