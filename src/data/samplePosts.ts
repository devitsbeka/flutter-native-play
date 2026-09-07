// The shape of a post in the social feed.
//
// This module used to carry ~31 invented users as well ("Sophia Martinez",
// "Marcus Johnson", sixteen of them flagged `verified: true`), each with a
// third-party cartoon avatar and a hot-linked stock-library cover, and
// `useSocialFeed` merged them into the feed it returned. Nothing rendered
// them — the feed that ships comes from `usePlayerFeedItems` — but a
// fabricated "verified" profile was one destructure away from a reviewer's
// screen, and hot-linking is against the stock library's licence either way.
//
// What is left here is the type, which eleven modules import. The fixture
// itself moved to `src/dev/sampleFeedFixture.ts`: nothing in the app imports
// it, so it is not in the production bundle, and
// `src/__tests__/no-fabricated-profiles.test.ts` fails if that changes.
export interface SamplePost {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  verified: boolean;
  createdAt: string;
  title: string;
  description: string;
  subject: string;
  hashtags: string[];
  coverGradient: string;
  coverImage?: string;
  questionCount: number;
  answerFormat: '4_answers' | 'true_false';
  likesCount: number;
  savesCount?: number;
  playsCount: number;
  commentsCount: number;
  questions: {
    question: string;
    correct_answer: string;
    incorrect_answers: string[];
    icon_slug?: string;
  }[];
  isUserPost?: boolean;
  isPublic?: boolean;
  // For collection play - all rounds in the collection
  collectionPosts?: SamplePost[];
  roundNumber?: number;
}
