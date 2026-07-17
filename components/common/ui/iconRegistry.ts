import AddIcon from '@/public/icons/add.svg';
import ArrowBackIcon from '@/public/icons/arrow-back.svg';
import ArrowDownIcon from '@/public/icons/arrow-down.svg';
import ArrowUpIcon from '@/public/icons/arrow-up.svg';
import BellIcon from '@/public/icons/bell.svg';
import CalendarIcon from '@/public/icons/calendar.svg';
import CarIcon from '@/public/icons/car.svg';
import ChartIcon from '@/public/icons/chart.svg';
import CheckIcon from '@/public/icons/check.svg';
import CloseIcon from '@/public/icons/close.svg';
import ConsoIcon from '@/public/icons/conso.svg';
import DashboardIcon from '@/public/icons/dashboard.svg';
import DeleteIcon from '@/public/icons/delete.svg';
import EditIcon from '@/public/icons/edit.svg';
import ElecBlueIcon from '@/public/icons/elec-blue.svg';
import ElecIcon from '@/public/icons/elec.svg';
import EuroIcon from '@/public/icons/euro.svg';
import EvPlugIcon from '@/public/icons/ev-plug.svg';
import AssuranceIcon from '@/public/icons/expenseCategories/assurance.svg';
import CarburantIcon from '@/public/icons/expenseCategories/carburant.svg';
import MaintenanceCatIcon from '@/public/icons/expenseCategories/maintenance.svg';
import OtherCatIcon from '@/public/icons/expenseCategories/other.svg';
import FamilyIcon from '@/public/icons/family.svg';
import GarageIcon from '@/public/icons/garage.svg';
import HistoryIcon from '@/public/icons/history.svg';
import LeafGreenIcon from '@/public/icons/leaf-green.svg';
import LeafIcon from '@/public/icons/leaf.svg';
import MenuIcon from '@/public/icons/menu.svg';
import MoreVerticalIcon from '@/public/icons/more-vertical.svg';
import NotesIcon from '@/public/icons/notes.svg';
import ErrorIcon from '@/public/icons/notif/error.svg';
import InfoIcon from '@/public/icons/notif/info.svg';
import SuccessIcon from '@/public/icons/notif/success.svg';
import WarningIcon from '@/public/icons/notif/warning.svg';
import ResponsiveIcon from '@/public/icons/responsive.svg';
import SearchIcon from '@/public/icons/search.svg';
import SecureIcon from '@/public/icons/secure.svg';
import SettingsIcon from '@/public/icons/settings.svg';
import SortAscendingIcon from '@/public/icons/sort-ascending.svg';
import SortDescendingIcon from '@/public/icons/sort-descending.svg';
import StackIcon from '@/public/icons/stack.svg';
import ToolIcon from '@/public/icons/tool.svg';
import TrendDownGreenIcon from '@/public/icons/trend-down-green.svg';
import TrendUpRedIcon from '@/public/icons/trend-up-red.svg';
import TrendingDownIcon from '@/public/icons/trending-down.svg';
import TrendingUpIcon from '@/public/icons/trending-up.svg';
import UserIcon from '@/public/icons/user.svg';

import type { FC, SVGProps } from 'react';

export const ICON_REGISTRY: Record<string, FC<SVGProps<SVGSVGElement>>> = {
  add: AddIcon,
  'arrow-back': ArrowBackIcon,
  'arrow-down': ArrowDownIcon,
  'arrow-up': ArrowUpIcon,
  bell: BellIcon,
  calendar: CalendarIcon,
  car: CarIcon,
  chart: ChartIcon,
  check: CheckIcon,
  close: CloseIcon,
  // alias used in some components
  x: CloseIcon,
  conso: ConsoIcon,
  dashboard: DashboardIcon,
  delete: DeleteIcon,
  edit: EditIcon,
  pencil: EditIcon,
  'elec-blue': ElecBlueIcon,
  elec: ElecIcon,
  euro: EuroIcon,
  'ev-plug': EvPlugIcon,
  family: FamilyIcon,
  garage: GarageIcon,
  history: HistoryIcon,
  'leaf-green': LeafGreenIcon,
  leaf: LeafIcon,
  menu: MenuIcon,
  'more-vertical': MoreVerticalIcon,
  notes: NotesIcon,
  responsive: ResponsiveIcon,
  search: SearchIcon,
  secure: SecureIcon,
  settings: SettingsIcon,
  'sort-ascending': SortAscendingIcon,
  'sort-descending': SortDescendingIcon,
  stack: StackIcon,
  tool: ToolIcon,
  'trend-down-green': TrendDownGreenIcon,
  'trend-up-red': TrendUpRedIcon,
  'trending-down': TrendingDownIcon,
  'trending-up': TrendingUpIcon,
  user: UserIcon,
  // Subfolder icons
  'expenseCategories/assurance': AssuranceIcon,
  'expenseCategories/carburant': CarburantIcon,
  'expenseCategories/maintenance': MaintenanceCatIcon,
  'expenseCategories/other': OtherCatIcon,
  'notif/error': ErrorIcon,
  'notif/info': InfoIcon,
  'notif/success': SuccessIcon,
  'notif/warning': WarningIcon,
};
