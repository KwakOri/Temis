import { Imgs } from '../_img/imgs';

const TeamTimeTableTopObject = () => {
  return (
    <div
      style={{
        width: 4096,
        height: 2304,
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

export default TeamTimeTableTopObject;
