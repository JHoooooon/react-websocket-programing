import { useContext, useEffect, useState } from "react";
import { Context } from "../../context";
import { socket } from "../../socket";
import Post from "../../types/post";
import Navbar from "../../components/navBar/Navbar";
import Card from "../../components/card/Card";

const PostingContainer = () => {
  const {
    state: { userName },
  } = useContext(Context);
  // post state 생성
  const [post, setPost] = useState<Post[]>([]);

  // 사용자 리스트 보냄
  useEffect(() => {
    socket.emit("userList", {});
  }, []);

  useEffect(() => {
    // user-list 에서 사용할 콜백
    // post[] 를 받아 post 스테이트에 할당
    const setPosting = (data: Post[]) => {
      setPost(data);
    };
    // user-list 이벤트 생성
    socket.on("user-list", setPosting);
    return () => {
      socket.off("user-list", setPosting);
    };
  }, [setPost]);

  return <div>
    <h2>{`Login as a ${userName}`}</h2>
    <div>
      <Navbar />
      {post.map(p => <Card key={p.id} loginUser={userName} post={p}/>)}
    </div>
  </div>;
};

export default PostingContainer;
