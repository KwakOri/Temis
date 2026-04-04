import { Imgs } from '../_img/imgs';

const TimeTableFrameTop = () => {
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
        src={Imgs['first']['frameTop'].src}
        alt={'frame-top'}
        draggable={false}
        className="w-full h-full object-cover"
      />
    </div>
  );
};

export default TimeTableFrameTop;
