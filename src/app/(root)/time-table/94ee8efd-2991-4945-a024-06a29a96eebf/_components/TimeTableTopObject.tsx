import { Imgs } from '../_img/imgs';

const TimeTableTopObject = () => {
  return (
    <div
      style={{
        zIndex: 40,
      }}
      className="absolute inset-0"
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
