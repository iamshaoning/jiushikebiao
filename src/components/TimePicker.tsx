/**
 * 时间选择器
 *
 * 分别设置小时和分钟，两个 ComboBox 并排
 * 支持手动输入（验证范围 0-23 / 0-59）和下拉选择
 */
import ComboBox from '@/components/ComboBox';

interface TimePickerProps {
  value: string; // HH:MM
  onChange: (time: string) => void;
  className?: string;
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => ({
  value: pad(h),
  label: pad(h),
}));

const MINUTE_OPTIONS = [
  { value: '00', label: '00' },
  { value: '15', label: '15' },
  { value: '30', label: '30' },
  { value: '45', label: '45' },
];

export default function TimePicker({ value, onChange, className = '' }: TimePickerProps) {
  const parts = value.split(':');
  const hours = parts[0] || '08';
  const minutes = parts[1] || '00';

  const handleHourChange = (v: string | number) => {
    const s = String(v);
    if (s === '') return;
    const num = parseInt(s, 10);
    if (isNaN(num) || num < 0 || num > 23) return;
    onChange(`${pad(num)}:${minutes}`);
  };

  const handleMinuteChange = (v: string | number) => {
    const s = String(v);
    if (s === '') return;
    const num = parseInt(s, 10);
    if (isNaN(num) || num < 0 || num > 59) return;
    onChange(`${hours}:${pad(num)}`);
  };

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <ComboBox
        value={hours}
        options={HOUR_OPTIONS}
        onChange={handleHourChange}
        className="flex-1"
        inputClassName="w-full"
        dropdownClassName="max-h-40"
      />
      <span className="text-gray-400 text-sm shrink-0">:</span>
      <ComboBox
        value={minutes}
        options={MINUTE_OPTIONS}
        onChange={handleMinuteChange}
        className="flex-1"
        inputClassName="w-full"
      />
    </div>
  );
}
