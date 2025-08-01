import React from 'react';
import styles from './WordBookCard.module.css';

export interface WordTypeStats {
  /** 名词数量 */
  nouns: number;
  /** 动词数量 */
  verbs: number;
  /** 形容词数量 */
  adjectives: number;
  /** 其他词性数量 */
  others: number;
}

export interface WordBook {
  /** 单词本ID */
  id: number;
  /** 单词本名称 */
  title: string;
  /** 单词本描述 */
  description: string;
  /** 图标 */
  icon: string;
  /** 图标颜色 */
  iconColor: 'primary' | 'orange' | 'yellow' | 'purple' | 'pink' | 'blue' | 'green';
  /** 总单词数 */
  totalWords: number;
  /** 关联计划数 */
  linkedPlans: number;
  /** 词性统计 */
  wordTypes: WordTypeStats;
  /** 创建时间 */
  createdAt: string;
  /** 最近使用时间 */
  lastUsed: string;
  /** 删除时间 */
  deletedAt?: string;
  /** 状态 */
  status: 'normal' | 'draft' | 'deleted';
}

export interface WordBookCardProps {
  /** 单词本数据 */
  book: WordBook;
  /** 点击卡片回调 */
  onClick?: (book: WordBook) => void;
}

/**
 * 单词本卡片组件
 */
export const WordBookCard: React.FC<WordBookCardProps> = ({
  book,
  onClick
}) => {
  const handleCardClick = () => {
    onClick?.(book);
  };

  const isDeleted = !!book.deletedAt;

  return (
    <div
      className={`${styles.card} ${isDeleted ? styles.deleted : ''}`}
      onClick={handleCardClick}
    >
      {/* Deleted Badge */}
      {isDeleted && (
        <div className={styles.deletedBadge}>
          <i className="fas fa-trash" />
          <span>已删除</span>
        </div>
      )}

      {/* Card Header */}
      <div className={styles.header}>
        <div className={`${styles.icon} ${styles[book.iconColor]} ${isDeleted ? styles.iconDeleted : ''}`}>
          <i className={`fas fa-${book.icon}`} />
        </div>
      </div>

      {/* Card Content */}
      <div className={styles.content}>
        <h3 className={styles.title}>{book.title}</h3>
        <p className={styles.description}>{book.description}</p>

        {/* Statistics */}
        <div className={styles.stats}>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{book.totalWords}</span>
            <span className={styles.statLabel}>总单词数</span>
          </div>
          <div className={styles.statItem}>
            <span className={`${styles.statValue} ${styles.primary}`}>{book.linkedPlans}</span>
            <span className={styles.statLabel}>关联计划</span>
          </div>
        </div>

        {/* Word Types Grid */}
        <div className={styles.wordTypes}>
          <div className={`${styles.wordType} ${styles.noun}`}>
            <span className={styles.wordTypeValue}>{book.wordTypes.nouns}</span>
            <span className={styles.wordTypeLabel}>名词</span>
          </div>
          <div className={`${styles.wordType} ${styles.verb}`}>
            <span className={styles.wordTypeValue}>{book.wordTypes.verbs}</span>
            <span className={styles.wordTypeLabel}>动词</span>
          </div>
          <div className={`${styles.wordType} ${styles.adjective}`}>
            <span className={styles.wordTypeValue}>{book.wordTypes.adjectives}</span>
            <span className={styles.wordTypeLabel}>形容词</span>
          </div>
          <div className={`${styles.wordType} ${styles.other}`}>
            <span className={styles.wordTypeValue}>{book.wordTypes.others}</span>
            <span className={styles.wordTypeLabel}>其他</span>
          </div>
        </div>

        {/* Metadata */}
        <div className={styles.metadata}>
          <span className={styles.created}>创建时间: {book.createdAt}</span>
          <span className={styles.lastUsed}>最近使用: {book.lastUsed}</span>
        </div>
      </div>
    </div>
  );
};

export default WordBookCard;