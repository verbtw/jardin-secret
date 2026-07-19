import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { PublicReview } from '../reviews/review-service';
import { ReviewCard } from './ReviewCard';
export function ReviewsSection({ reviews, limit }: { reviews: PublicReview[]; limit?: number }) { const visible = limit ? reviews.slice(0, limit) : reviews; return <section className="reviews-section section-wrap"><div className="section-heading"><div><p className="eyebrow">Говорят покупатели</p><h2>Отзывы без<br /><em>витринного блеска</em></h2></div>{limit && <Link className="text-link" to="/reviews">Все отзывы <ArrowRight size={16} /></Link>}</div><div className="reviews-grid">{visible.map((review) => <ReviewCard key={review.id} review={review} />)}</div></section>; }
