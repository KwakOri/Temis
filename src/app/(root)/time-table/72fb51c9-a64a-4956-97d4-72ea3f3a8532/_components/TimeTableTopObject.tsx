import { Imgs } from '../_img/imgs';

const TimeTableTopObject = () => {
  return (
    <div
      style={{
        width: 4000,
        height: 2250,
        position: 'absolute',
        zIndex: 30,
      }}
    >
      <img
        src={Imgs['first']['top_object'].src}
        alt={'top-object'}
        draggable={false}
      />
    </div>
  );
};

export default TimeTableTopObject;
