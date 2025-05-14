import React, { useContext, useState, useEffect, useRef } from "react";

// Styles
import styles from "../../styles/player/_Title.module.scss";
const URL = "/assets/";

// Icon
import { ReactSVG } from "react-svg";

import ShareModal from "./ShareModal";

// Context
import { ContentStateContext } from "../../context/ContentState"; // Import the ContentState context

const Title = () => {
  const [showShare, setShowShare] = useState(false);
  const [contentState, setContentState] = useContext(ContentStateContext); // Access the ContentState context
  const inputRef = useRef(null);
  // Show the video title, as a heading by default (multiline), on click show a text input to edit the title
  const [showTitle, setShowTitle] = useState(true);
  const [title, setTitle] = useState(contentState.title);
  const [displayTitle, setDisplayTitle] = useState(contentState.title);
  const [uploadedUrl, setUploadedUrl] = useState(""); // 保存上传后的URL

  useEffect(() => {
    setTitle(contentState.title);
    if (contentState.title.length > 80) {
      setDisplayTitle(contentState.title.slice(0, 80) + "...");
    } else {
      setDisplayTitle(contentState.title);
    }
  }, [contentState.title]);

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
  };

  const handleTitleClick = () => {
    setShowTitle(false);
  };

  const handleTitleBlur = () => {
    setShowTitle(true);
    setContentState((prevState) => ({
      ...prevState,
      title: title,
    }));
  };

  useEffect(() => {
    if (!showTitle) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [showTitle]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Enter") {
        setShowTitle(true);
        setContentState((prevState) => ({
          ...prevState,
          title: title,
        }));
      } else if (e.key === "Escape") {
        setShowTitle(true);
        setTitle(contentState.title);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [title]);

  // 复制链接到剪贴板
  const copyToClipboard = (text) => {
    try {
      // 创建临时元素
      const tempInput = document.createElement('input');
      tempInput.style.position = 'absolute';
      tempInput.style.left = '-1000px';
      tempInput.value = text;
      document.body.appendChild(tempInput);
      tempInput.select();
      
      // 执行复制命令
      const successful = document.execCommand('copy');
      
      // 移除临时元素
      document.body.removeChild(tempInput);
      
      if (successful && typeof contentState.openToast === "function") {
        contentState.openToast("链接已复制到剪贴板！", () => {});
      } else if (typeof contentState.openToast === "function") {
        contentState.openToast("复制失败，请手动复制: " + text, () => {});
      }
    } catch (err) {
      console.error('复制失败:', err);
      if (typeof contentState.openToast === "function") {
        contentState.openToast("复制失败，请手动复制: " + text, () => {});
      }
    }
  };

  // 简单的显示一个Toast提示
  const showUploadSuccess = (url) => {
    setUploadedUrl(url); // 保存上传的URL
    
    if (typeof contentState.openToast === "function") {
      contentState.openToast("视频已成功上传，点击右上角查看链接", () => {});
    }
  };

  const handleShareVideo = () => {
    // 如果视频还没准备好或者正在上传中，不执行任何操作
    if (!contentState.mp4ready || contentState.uploading) {
      return;
    }
    
    // 设置上传状态
    setContentState((prevState) => ({
      ...prevState,
      uploading: true,
      uploadSuccess: false,
      uploadUrl: "",
    }));
    
    // 上传视频处理
    try {
      // 检查是否有准备好的blob对象
      if (contentState.blob) {
        const reader = new FileReader();
        reader.readAsDataURL(contentState.blob);
        reader.onloadend = function () {
          // 直接上传到服务器
          const uploadUrl = "http://10.255.60.252:5000/upload";
          const base64 = reader.result;
          const blob = base64ToUint8Array(base64);
          const formData = new FormData();
          formData.append('video', blob, contentState.title.replace(/[\/\\:?~<>|*]/g, " ") + ".mp4");
          
          fetch(uploadUrl, {
            method: 'POST',
            body: formData
          })
          .then(response => {
            if (!response.ok) {
              throw new Error(`上传失败: ${response.status} ${response.statusText}`);
            }
            return response.json();
          })
          .then(data => {
            // 上传成功，显示成功消息并更新状态
            setContentState((prevState) => ({
              ...prevState,
              uploading: false,
              uploadSuccess: true,
              uploadUrl: data.url,
            }));
            
            // 显示上传成功提示
            showUploadSuccess(data.url);
          })
          .catch(error => {
            console.error("上传错误:", error);
            setContentState((prevState) => ({
              ...prevState,
              uploading: false,
            }));
            
            if (typeof contentState.openToast === "function") {
              contentState.openToast(`上传失败: ${error.message}`, () => {});
            }
          });
        };
      } else {
        throw new Error("视频尚未准备好");
      }
    } catch (error) {
      console.error("准备上传时发生错误:", error);
      setContentState((prevState) => ({
        ...prevState,
        uploading: false,
      }));
      
      if (typeof contentState.openToast === "function") {
        contentState.openToast(`上传失败: ${error.message}`, () => {});
      }
    }
  };
  
  // 将base64转换为Blob
  const base64ToUint8Array = (base64) => {
    const dataUrlRegex = /^data:(.*?);base64,/;
    const matches = base64.match(dataUrlRegex);
    if (matches !== null) {
      // Base64 is a data URL
      const mimeType = matches[1];
      const binaryString = atob(base64.slice(matches[0].length));
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return new Blob([bytes], { type: mimeType });
    } else {
      // Base64 is a regular string
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return new Blob([bytes], { type: "video/mp4" });
    }
  };

  return (
    <div className={styles.TitleParent}>
      {showShare && (
        <ShareModal showShare={showShare} setShowShare={setShowShare} />
      )}
      <div className={styles.TitleWrap}>
        {showTitle ? (
          <>
            <h1 onClick={handleTitleClick}>
              {displayTitle}{" "}
              <ReactSVG
                src={URL + "editor/icons/pencil.svg"}
                className={styles.pencil}
                styles={{ display: "inline-block" }}
              />
            </h1>
            <div className={styles.shareLinks}>
              {uploadedUrl && (
                <>
                  <a 
                    href={uploadedUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className={styles.uploadedLink}
                    title="点击打开已上传的视频链接"
                  >
                    <ReactSVG
                      src={URL + "editor/icons/link.svg"}
                      className={styles.linkIcon}
                    />
                    查看链接
                  </a>
                  <div 
                    className={styles.copyButton}
                    onClick={() => copyToClipboard(uploadedUrl)}
                    title="复制链接到剪贴板"
                  >
                    <ReactSVG
                      src={URL + "editor/icons/clipboard.svg"}
                      className={styles.copyIcon}
                    />
                    复制链接
                  </div>
                </>
              )}
              <div
                className={styles.shareButton}
                onClick={handleShareVideo}
                style={{
                  opacity: (!contentState.mp4ready || contentState.uploading) ? 0.5 : 1,
                  cursor: (!contentState.mp4ready || contentState.uploading) ? 'not-allowed' : 'pointer'
                }}
              >
                <ReactSVG
                  src={URL + "editor/icons/link.svg"}
                  className={styles.shareIcon}
                />
                {contentState.uploading ? "上传中..." : 
                 contentState.uploadSuccess ? "已上传" : 
                 chrome.i18n.getMessage("shareSandboxButton")}
              </div>
            </div>
          </>
        ) : (
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            onBlur={handleTitleBlur}
            ref={inputRef}
          />
        )}
      </div>
    </div>
  );
};

export default Title;
