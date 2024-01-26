import classNames from "classnames";
import styles from "./HomeContainer.module.css";
import { Link } from "react-router-dom";
import { useEffect } from "react";
import { rsv_sock } from "../../socket";
import { images } from "./images";
const cx = classNames.bind(styles);

const HomeContainer = () => {
  useEffect(() => {
    // 해당 페이지 진입시 rsv_sock 연결
    rsv_sock.connect();
  }, []);

  return (
    <div className={cx(styles.home_container)}>
      <div className={cx(styles.title)}>Movie Chart</div>
      <ul className={cx(styles.wrap_movies)}>
        {images.map((image, idx) => (
          <li key={`${image}_${idx}`} className={cx(styles.movie)}>
            <Link
              to={`/seat/${idx + 1}/${image.title}`}
              style={{ textDecoration: `none` }}
            >
              <div className={cx(styles.img_wrap)}>
                <img
                  src={image.img}
                  width="250px"
                  height="300px"
                  alt="avatar_movie_poster"
                  className={cx(styles.img)}
                />
                <h3 className={cx(styles.number)}>{idx + 1}</h3>
              </div>
            </Link>
            {idx + 1 === 2 ? (
              <div className={cx(styles.movie_title)}>
                Ant-Man and the Wasp:
                <br />
                Quantumania
              </div>
            ) : (
              <div className={cx(styles.movie_title)}>{image.title}</div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default HomeContainer;
