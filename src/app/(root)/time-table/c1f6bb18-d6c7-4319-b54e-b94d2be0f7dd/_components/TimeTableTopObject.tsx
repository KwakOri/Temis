import { Imgs } from '../_img/imgs';
import { templateSize } from '../_settings/settings';

const TimeTableTopObject = () => {
  return (
    <div
      style={{
        width: templateSize.width,
        height: templateSize.height,
        position: 'absolute',
        zIndex: 40,
      }}
    >
      <img
        src={Imgs['first']['top_object'].src}
        alt={'top_object'}
        draggable={false}
      />
    </div>
  );
};

export default TimeTableTopObject;
