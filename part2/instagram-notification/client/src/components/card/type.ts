import Post from "../../types/post";

export default interface CardProps {
  key: string;
  post: Post;
  loginUser: string;
}