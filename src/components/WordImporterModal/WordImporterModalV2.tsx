import React, { useState, useEffect } from 'react';
import { Modal, Button, WordGrid } from '../';
import type { AnalysisProgress, AIModel, WordExtractionMode } from '../../types';
import type { ExtractedWord } from '../WordGrid';
import { WordBookService } from '../../services/wordbookService';
import { AIModelService } from '../../services/aiModelService';
import styles from './WordImporterModal.module.css';

export interface WordImporterModalV2Props {
  /** 是否显示模态框 */
  isOpen: boolean;
  /** 关闭模态框回调 */
  onClose: () => void;
  /** 保存单词回调 */
  onSaveWords: (words: ExtractedWord[]) => Promise<void>;
  /** 保存状态 */
  saving: boolean;
}

type Step = 'input' | 'analyzing' | 'selection';

/**
 * 单词导入模态框组件 V2 - 三步骤交互
 */
export const WordImporterModalV2: React.FC<WordImporterModalV2Props> = ({
  isOpen,
  onClose,
  onSaveWords,
  saving
}) => {
  const [currentStep, setCurrentStep] = useState<Step>('input');
  const [textContent, setTextContent] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [availableModels, setAvailableModels] = useState<AIModel[]>([]);
  const [extractedWords, setExtractedWords] = useState<ExtractedWord[]>([]);
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'network' | 'parsing' | 'timeout' | 'validation' | 'unknown'>('unknown');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  // const [analysisResult, setAnalysisResult] = useState<any>(null);
  // const [analysisPromiseRef, setAnalysisPromiseRef] = useState<Promise<any> | null>(null);
  const [extractionMode, setExtractionMode] = useState<WordExtractionMode>('focus');
  const [pollIntervalRef, setPollIntervalRef] = useState<number | null>(null);
  const [pollTimeoutRef, setPollTimeoutRef] = useState<number | null>(null);

  // 添加状态变化监听
  const handleExtractionModeChange = (mode: WordExtractionMode) => {
    console.log('🎯 Extraction Mode Changed:', mode);
    setExtractionMode(mode);
  };

  // 清理轮询的函数
  const clearPolling = () => {
    if (pollIntervalRef) {
      clearInterval(pollIntervalRef);
      setPollIntervalRef(null);
    }
    if (pollTimeoutRef) {
      clearTimeout(pollTimeoutRef);
      setPollTimeoutRef(null);
    }
  };

  const wordBookService = new WordBookService();
  const aiModelService = new AIModelService();

  // 组件卸载时清理轮询
  useEffect(() => {
    return () => {
      clearPolling();
    };
  }, []);

  // 智能错误处理函数
  const handleError = (errorMessage: string, context?: string) => {
    console.error('Analysis error:', errorMessage, context);

    let userFriendlyMessage = '';
    let errorType: 'network' | 'parsing' | 'timeout' | 'validation' | 'unknown' = 'unknown';

    // 根据错误信息分类处理
    if (errorMessage.includes('XML parsing error') || errorMessage.includes('Failed to parse')) {
      errorType = 'parsing';
      userFriendlyMessage = 'AI分析结果格式异常，这通常是由于文本内容过于复杂导致的。请尝试：\n• 减少文本长度\n• 简化文本内容\n• 重新分析';
    } else if (errorMessage.includes('timeout') || errorMessage.includes('超时')) {
      errorType = 'timeout';
      userFriendlyMessage = '分析时间过长，请尝试：\n• 减少文本长度\n• 选择更快的AI模型\n• 稍后重试';
    } else if (errorMessage.includes('network') || errorMessage.includes('连接') || errorMessage.includes('请求失败')) {
      errorType = 'network';
      userFriendlyMessage = '网络连接异常，请检查：\n• 网络连接是否正常\n• AI服务是否可用\n• 稍后重试';
    } else if (errorMessage.includes('文本内容') || errorMessage.includes('validation')) {
      errorType = 'validation';
      userFriendlyMessage = '文本内容不符合要求，请检查：\n• 文本是否为空\n• 文本长度是否合适\n• 文本格式是否正确';
    } else {
      errorType = 'unknown';
      userFriendlyMessage = '分析过程中出现了问题，建议：\n• 检查文本内容\n• 尝试更换AI模型\n• 稍后重试';
    }

    // 清理轮询
    clearPolling();

    setError(userFriendlyMessage);
    setErrorType(errorType);
    setCurrentStep('input');
  };

  // 清除错误状态
  const clearError = () => {
    setError(null);
    setErrorType('unknown');
  };

  // 获取错误图标
  const getErrorIcon = (type: string): string => {
    switch (type) {
      case 'network': return 'fa-wifi';
      case 'parsing': return 'fa-code';
      case 'timeout': return 'fa-clock';
      case 'validation': return 'fa-edit';
      default: return 'fa-exclamation-triangle';
    }
  };

  // 获取错误标题
  const getErrorTitle = (type: string): string => {
    switch (type) {
      case 'network': return '网络连接问题';
      case 'parsing': return 'AI分析格式异常';
      case 'timeout': return '分析超时';
      case 'validation': return '输入验证失败';
      default: return '分析失败';
    }
  };

  // 转换词性缩写
  const convertPOSAbbreviation = (pos: string): ExtractedWord['partOfSpeech'] => {
    if (!pos) return 'n.';

    const normalizedPos = pos.toLowerCase().replace(/\./g, '').trim();
    const posMap: Record<string, ExtractedWord['partOfSpeech']> = {
      'n': 'n.',
      'noun': 'n.',
      'nouns': 'n.',
      'v': 'v.',
      'verb': 'v.',
      'verbs': 'v.',
      'adj': 'adj.',
      'adjective': 'adj.',
      'adjectives': 'adj.',
      'adv': 'adv.',
      'adverb': 'adv.',
      'adverbs': 'adv.',
      'prep': 'prep.',
      'preposition': 'prep.',
      'prepositions': 'prep.',
      'conj': 'conj.',
      'conjunction': 'conj.',
      'conjunctions': 'conj.',
      'int': 'int.',
      'interjection': 'int.',
      'interjections': 'int.',
      'pron': 'pron.',
      'pronoun': 'pron.',
      'pronouns': 'pron.',
      'art': 'art.',
      'article': 'art.',
      'articles': 'art.',
      'det': 'det.',
      'determiner': 'det.',
      'determiners': 'det.'
    };
    return (posMap[normalizedPos] as ExtractedWord['partOfSpeech']) || 'n.';
  };

  // 转换 PhonicsWord 到 ExtractedWord
  const convertPhonicsToExtracted = (phonicsWords: any[]): ExtractedWord[] => {
    return phonicsWords.map((word, index) => ({
      id: `${index + 1}`,
      word: word.word,
      meaning: word.chinese_translation,
      partOfSpeech: convertPOSAbbreviation(word.pos_abbreviation),
      frequency: word.frequency || 1,
      selected: true, // 默认选中所有单词
      // 添加自然拼读特有的信息
      phonics: {
        ipa: word.ipa,
        syllables: word.syllables,
        phonics_rule: word.phonics_rule,
        analysis_explanation: word.analysis_explanation,
        pos_abbreviation: word.pos_abbreviation,
        pos_english: word.pos_english,
        pos_chinese: word.pos_chinese,
        frequency: word.frequency
      }
    }));
  };

  // 加载可用模型
  useEffect(() => {
    const loadModels = async () => {
      try {
        const result = await aiModelService.getAIModels();
        if (result.success) {
          // 转换AIModelConfig到AIModel格式
          const models: AIModel[] = result.data.map(config => ({
            id: config.id,
            provider_id: config.provider.id,
            name: config.name,
            display_name: config.display_name,
            model_id: config.model_id,
            description: config.description,
            max_tokens: config.max_tokens,
            temperature: config.temperature,
            is_active: config.is_active,
            is_default: config.is_default,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }));
          setAvailableModels(models);
          // 自动选择第一个模型
          if (result.data.length > 0) {
            setSelectedModel(result.data[0].id.toString());
          }
        }
      } catch (err) {
        console.error('Failed to load AI models:', err);
      }
    };

    if (isOpen) {
      loadModels();
    }
  }, [isOpen]);

  // 重置状态
  const resetState = () => {
    // 清理轮询
    clearPolling();

    setCurrentStep('input');
    setTextContent('');
    setExtractedWords([]);
    setAnalysisProgress(null);
    setError(null);
    setUploadedFileName(null);
    // setAnalysisResult(null);
    // setAnalysisPromiseRef(null);
  };

  // 处理文件上传
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 检查文件类型
    const allowedTypes = ['text/plain', 'text/markdown'];
    const allowedExtensions = ['.txt', '.md', '.markdown'];

    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    const isValidType = allowedTypes.includes(file.type) || allowedExtensions.includes(fileExtension);

    if (!isValidType) {
      setError('请上传 .txt 或 .md 文件');
      return;
    }

    // 检查文件大小 (限制为5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setError('文件大小不能超过 5MB');
      return;
    }

    try {
      const text = await file.text();
      setTextContent(text);
      setUploadedFileName(file.name);
      setError(null);
    } catch (err) {
      setError('文件读取失败，请重试');
    }

    // 清空input值，允许重复上传同一文件
    event.target.value = '';
  };

  // 清除上传的文件
  const handleClearFile = () => {
    setTextContent('');
    setUploadedFileName(null);
    setError(null);
  };

  // 取消分析
  const handleCancelAnalysis = async () => {
    try {
      // 通知后端取消分析
      await wordBookService.cancelAnalysis();
    } catch (error) {
      console.error('Failed to cancel backend analysis:', error);
    }

    // 直接取消，不需要确认
    resetState();
    setCurrentStep('input');
  };

  // 关闭模态框
  const handleClose = () => {
    // 如果正在分析中，询问用户是否确认关闭
    if (currentStep === 'analyzing') {
      if (window.confirm('分析正在进行中，确定要关闭吗？这将中断当前分析。')) {
        resetState();
        onClose();
      }
    } else {
      resetState();
      onClose();
    }
  };

  // 开始分析
  const handleStartAnalysis = async () => {
    if (!textContent.trim()) {
      handleError('请输入要分析的文本内容', 'Empty text content');
      return;
    }

    if (!selectedModel) {
      handleError('请选择AI模型', 'No model selected');
      return;
    }

    // 清除之前的错误状态
    clearError();
    setCurrentStep('analyzing');

    try {
      // 清除之前的进度
      await wordBookService.clearAnalysisProgress();



      // 开始分析（这是异步的，会在后台进行）
      const analysisPromise = aiModelService.analyzePhonics(
        textContent,
        parseInt(selectedModel),
        extractionMode
      );

      // 保存Promise引用供轮询使用
      // setAnalysisPromiseRef(analysisPromise);

      // 启动轮询进度，传入Promise引用
      // const pollInterval = startProgressPolling(analysisPromise);
      startProgressPolling(analysisPromise);

      // 不等待分析完成，让轮询来处理进度更新
      // 但同时监听Promise完成，作为备用机制
      analysisPromise.then(result => {
        if (result.success && result.data && result.data.words && result.data.words.length > 0) {
          // 分析成功且有结果
          const convertedWords = convertPhonicsToExtracted(result.data.words);
          setExtractedWords(convertedWords);
          setCurrentStep('selection');
        } else if (result.success && result.data && result.data.words && result.data.words.length === 0) {
          // 分析成功但没有单词，可能是被取消了
          console.log('Analysis completed with empty result, likely cancelled');
          // 不需要处理，取消操作已经在handleCancelAnalysis中处理了
        } else {
          // 真正的错误
          handleError('分析完成但未获取到有效结果', 'Promise resolved with invalid result');
        }
      }).catch(err => {
        handleError(err instanceof Error ? err.message : '分析失败', 'Promise rejected');
      });

    } catch (err) {
      handleError(err instanceof Error ? err.message : '分析失败', 'Analysis initiation failed');
    }
  };

  // 轮询进度
  const startProgressPolling = (analysisPromise: Promise<any>) => {
    // 清理之前的轮询
    clearPolling();

    const pollInterval = setInterval(async () => {
      try {
        const result = await wordBookService.getAnalysisProgress();
        if (result.success && result.data) {
          setAnalysisProgress(result.data);

          if (result.data.status === 'completed') {
            clearPolling();

            // 分析完成，直接从Promise获取结果
            analysisPromise.then(analysisResult => {
              if (analysisResult.success && analysisResult.data && analysisResult.data.words) {
                const convertedWords = convertPhonicsToExtracted(analysisResult.data.words);
                setExtractedWords(convertedWords);
                console.log('Converted words:', convertedWords);
                setCurrentStep('selection');
              } else {
                handleError('分析完成但未获取到有效结果，请重试', 'Progress completed but no valid result');
              }
            }).catch(err => {
              handleError('获取分析结果失败：' + (err.message || '未知错误'), 'Failed to get analysis result from progress');
            });
          } else if (result.data.status === 'error') {
            clearPolling();
            handleError(result.data.error_message || '分析失败', 'Progress status error');
          }
        }
      } catch (err) {
        console.error('Progress polling error:', err);
        clearPolling();
        handleError('获取进度失败', 'Progress polling error');
      }
    }, 500); // 每0.5秒轮询一次，更频繁的更新

    // 设置超时 - 增加到10分钟，因为复杂文本的AI分析可能需要较长时间
    const timeoutId = setTimeout(() => {
      clearPolling();
      if (currentStep === 'analyzing') {
        handleError('分析超时（超过10分钟），请尝试减少文本长度或稍后重试', 'Analysis timeout');
      }
    }, 600000); // 10分钟超时

    // 保存轮询引用
    setPollIntervalRef(pollInterval);
    setPollTimeoutRef(timeoutId);

    return pollInterval;
  };

  // 重新分析
  const handleReanalyze = () => {
    // 清理当前状态
    clearPolling();
    setExtractedWords([]);
    setAnalysisProgress(null);
    setError(null);
    // setAnalysisResult(null);
    // setAnalysisPromiseRef(null);

    // 重新开始分析
    handleStartAnalysis();
  };

  // 返回输入步骤
  // const handleBackToInput = () => {
  //   setCurrentStep('input');
  //   setExtractedWords([]);
  //   setAnalysisProgress(null);
  //   setError(null);
  //   setAnalysisResult(null);
  //   setAnalysisPromiseRef(null);
  // };

  // 单词选择切换
  const handleWordToggle = (wordId: string) => {
    setExtractedWords(prev => 
      prev.map(word => 
        word.id === wordId 
          ? { ...word, selected: !word.selected }
          : word
      )
    );
  };

  // 全选/取消全选
  const handleSelectAll = (selected: boolean) => {
    setExtractedWords(prev => 
      prev.map(word => ({ ...word, selected }))
    );
  };

  // 保存选中的单词
  const handleSaveSelectedWords = async () => {
    const selectedWords = extractedWords.filter(word => word.selected);
    if (selectedWords.length === 0) {
      setError('请至少选择一个单词');
      return;
    }

    try {
      await onSaveWords(selectedWords);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    }
  };

  // 渲染输入步骤
  const renderInputStep = () => (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h3>步骤 1: 输入文本</h3>
        <p>请输入要分析的英文文本，或上传 .txt/.md 文件，AI将为您提取单词并进行自然拼读分析</p>
      </div>

      <div className={styles.inputSection}>
        {/* 文件上传区域 */}
        <div className={styles.uploadSection}>
          <div className={styles.uploadArea}>
            <input
              type="file"
              id="fileUpload"
              className={styles.fileInput}
              accept=".txt,.md,.markdown,text/plain,text/markdown"
              onChange={handleFileUpload}
            />
            <label htmlFor="fileUpload" className={styles.uploadLabel}>
              <i className="fas fa-cloud-upload-alt" />
              <span>点击上传文件</span>
              <small>支持 .txt 和 .md 文件，最大 5MB</small>
            </label>
          </div>

          {uploadedFileName && (
            <div className={styles.uploadedFile}>
              <div className={styles.fileName}>
                <i className="fas fa-file-alt" />
                <span>{uploadedFileName}</span>
              </div>
              <button
                type="button"
                className={styles.clearFileBtn}
                onClick={handleClearFile}
                title="清除文件"
              >
                <i className="fas fa-times" />
              </button>
            </div>
          )}
        </div>

        {/* 分隔线 */}
        <div className={styles.divider}>
          <span>或者</span>
        </div>

        {/* 文本输入区域 */}
        <textarea
          className={styles.textInput}
          placeholder="直接输入英文文本..."
          value={textContent}
          onChange={(e) => setTextContent(e.target.value)}
          rows={8}
        />
      </div>

      <div className={styles.modelSection}>
        <label className={styles.modelLabel}>选择AI模型:</label>
        <select
          className={styles.modelSelect}
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          aria-label="选择AI模型"
        >
          <option value="">请选择模型</option>
          {availableModels.map(model => (
            <option key={model.id} value={model.id.toString()}>
              {model.display_name}
            </option>
          ))}
        </select>
      </div>

      {/* 提取模式选择 */}
      <div className={styles.extractionModeSection}>
        <label className={styles.modelLabel}>提取模式:</label>
        <div className={styles.modeOptions}>
          <label className={`${styles.modeOption} ${extractionMode === 'focus' ? styles.selected : ''}`}>
            <input
              type="radio"
              name="extractionMode"
              value="focus"
              checked={extractionMode === 'focus'}
              onChange={(e) => handleExtractionModeChange(e.target.value as WordExtractionMode)}
              className={styles.modeRadio}
            />
            <div className={styles.modeContent}>
              <div className={styles.modeTitle}>
                <i className="fas fa-bullseye" />
                重点模式（推荐）
              </div>
              <div className={styles.modeDescription}>
                过滤掉 a、the、is 等简单词汇，专注于有学习价值的单词
              </div>
            </div>
          </label>

          <label className={`${styles.modeOption} ${extractionMode === 'all' ? styles.selected : ''}`}>
            <input
              type="radio"
              name="extractionMode"
              value="all"
              checked={extractionMode === 'all'}
              onChange={(e) => handleExtractionModeChange(e.target.value as WordExtractionMode)}
              className={styles.modeRadio}
            />
            <div className={styles.modeContent}>
              <div className={styles.modeTitle}>
                <i className="fas fa-list" />
                全量模式
              </div>
              <div className={styles.modeDescription}>
                提取文本中的所有单词，包括简单的功能词
              </div>
            </div>
          </label>
        </div>
      </div>

      {error && (
        <div className={`${styles.error} ${styles[`error${errorType.charAt(0).toUpperCase() + errorType.slice(1)}`] || ''}`}>
          <div className={styles.errorHeader}>
            <i className={`fas ${getErrorIcon(errorType)}`} />
            <span className={styles.errorTitle}>{getErrorTitle(errorType)}</span>
          </div>
          <div className={styles.errorMessage}>
            {error.split('\n').map((line, index) => (
              <div key={index} className={styles.errorLine}>
                {line}
              </div>
            ))}
          </div>
          <div className={styles.errorActions}>
            <Button
              variant="secondary"
              size="sm"
              onClick={clearError}
            >
              知道了
            </Button>
            {(errorType === 'parsing' || errorType === 'timeout' || errorType === 'network') && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  clearError();
                  handleStartAnalysis();
                }}
              >
                重新分析
              </Button>
            )}
          </div>
        </div>
      )}

      <div className={styles.stepActions}>
        <Button variant="secondary" onClick={handleClose}>
          取消
        </Button>
        <Button 
          variant="primary" 
          onClick={handleStartAnalysis}
          disabled={!textContent.trim() || !selectedModel}
        >
          开始分析
        </Button>
      </div>
    </div>
  );

  // 渲染分析进度步骤
  const renderAnalyzingStep = () => (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h3>步骤 2: AI分析中</h3>
        <p>正在使用AI模型分析您的文本，请稍候...</p>
      </div>

      <div className={styles.progressSection}>
        {analysisProgress && (
          <>
            <div className={styles.progressInfo}>
              <div className={styles.progressStep}>
                <i className="fas fa-cog fa-spin" />
                {analysisProgress.current_step}
              </div>
              
              <div className={styles.progressStats}>
                <div className={styles.progressStat}>
                  <span className={styles.statLabel}>已接收:</span>
                  <span className={styles.statValue}>{analysisProgress.chunks_received} 块</span>
                </div>
                <div className={styles.progressStat}>
                  <span className={styles.statLabel}>字符数:</span>
                  <span className={styles.statValue}>{analysisProgress.total_chars.toLocaleString()}</span>
                </div>
                <div className={styles.progressStat}>
                  <span className={styles.statLabel}>用时:</span>
                  <span className={styles.statValue}>{analysisProgress.elapsed_seconds.toFixed(1)}s</span>
                </div>
              </div>

              {analysisProgress.elapsed_seconds > 60 && (
                <div className={styles.progressTip}>
                  <i className="fas fa-info-circle" />
                  <span>复杂文本分析需要较长时间，请耐心等待。通常需要3-8分钟。</span>
                </div>
              )}
            </div>

            <div className={styles.progressBar}>
              <div
                className={`${styles.progressFill} ${
                  analysisProgress.status === 'completed' ? styles.progressComplete :
                  analysisProgress.chunks_received > 0 ? styles.progressActive : styles.progressStarted
                }`}
              />
            </div>
          </>
        )}
      </div>

      <div className={styles.stepActions}>
        <Button
          variant="secondary"
          onClick={handleCancelAnalysis}
        >
          取消分析
        </Button>
      </div>
    </div>
  );

  // 渲染单词选择步骤
  const renderSelectionStep = () => (
    <div className={styles.stepContent}>
      <div className={styles.stepHeader}>
        <h3>步骤 3: 选择单词</h3>
        <p>请选择要添加到单词本的单词</p>
      </div>

      <div className={styles.selectionSection}>
        <WordGrid
          words={extractedWords}
          onWordToggle={handleWordToggle}
          onSelectAll={handleSelectAll}
        />
      </div>

      {error && (
        <div className={`${styles.error} ${styles[`error${errorType.charAt(0).toUpperCase() + errorType.slice(1)}`] || ''}`}>
          <div className={styles.errorHeader}>
            <i className={`fas ${getErrorIcon(errorType)}`} />
            <span className={styles.errorTitle}>{getErrorTitle(errorType)}</span>
          </div>
          <div className={styles.errorMessage}>
            {error.split('\n').map((line, index) => (
              <div key={index} className={styles.errorLine}>
                {line}
              </div>
            ))}
          </div>
          <div className={styles.errorActions}>
            <Button
              variant="secondary"
              size="sm"
              onClick={clearError}
            >
              知道了
            </Button>
          </div>
        </div>
      )}

      <div className={styles.stepActions}>
        <Button variant="secondary" onClick={handleReanalyze}>
          重新分析
        </Button>
        <Button variant="secondary" onClick={handleClose}>
          取消
        </Button>
        <Button 
          variant="primary" 
          onClick={handleSaveSelectedWords}
          disabled={saving || extractedWords.filter(w => w.selected).length === 0}
          loading={saving}
        >
          保存单词 ({extractedWords.filter(w => w.selected).length})
        </Button>
      </div>
    </div>
  );

  // 渲染当前步骤
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'input':
        return renderInputStep();
      case 'analyzing':
        return renderAnalyzingStep();
      case 'selection':
        return renderSelectionStep();
      default:
        return renderInputStep();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="补充单词"
      size="large"
    >
      <div className={styles.modalContent}>
        {/* 步骤指示器 */}
        <div className={styles.stepIndicator}>
          <div className={`${styles.step} ${currentStep === 'input' ? styles.active : ''} ${currentStep !== 'input' ? styles.completed : ''}`}>
            <div className={styles.stepNumber}>1</div>
            <div className={styles.stepLabel}>输入文本</div>
          </div>
          <div className={styles.stepConnector} />
          <div className={`${styles.step} ${currentStep === 'analyzing' ? styles.active : ''} ${currentStep === 'selection' ? styles.completed : ''}`}>
            <div className={styles.stepNumber}>2</div>
            <div className={styles.stepLabel}>AI分析</div>
          </div>
          <div className={styles.stepConnector} />
          <div className={`${styles.step} ${currentStep === 'selection' ? styles.active : ''}`}>
            <div className={styles.stepNumber}>3</div>
            <div className={styles.stepLabel}>选择单词</div>
          </div>
        </div>

        {/* 当前步骤内容 */}
        {renderCurrentStep()}
      </div>
    </Modal>
  );
};

export default WordImporterModalV2;
