import { Imgs } from '../_img/imgs';

const TimeTableTopObject = () => {
  return (
    <div
      style={{
        width: 1920,
        height: 1080,
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
