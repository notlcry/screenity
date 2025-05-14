import React, { useContext, useState } from "react";

import styles from "../../styles/player/_ShareModal.module.scss";

import { ReactSVG } from "react-svg";

// Context
import { ContentStateContext } from "../../context/ContentState"; // Import the ContentState context

const URL = "/assets/";

const ShareModal = ({ showShare, setShowShare }) => {
  const [contentState, setContentState] = useContext(ContentStateContext); // Access the ContentState context
  
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
  
  const handleUploadVideo = () => {
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
    
    // 关闭模态框
    setShowShare(false);
    
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
            
            // 显示上传成功提示，并提供复制选项
            if (typeof contentState.openToast === "function") {
              contentState.openToast(`视频已成功上传!`, () => {
                // 点击Toast时复制链接
                copyToClipboard(data.url);
              });
            }

            // 延迟1秒后弹出第二个提示，显示更多选项
            setTimeout(() => {
              if (typeof contentState.openToast === "function") {
                contentState.openToast(`点击查看链接: ${data.url.substring(0, 25)}...`, () => {
                  // 打开链接
                  window.open(data.url, '_blank');
                });
              }
            }, 1000);
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
    <div className={styles.modalWrap}>
      <div className={styles.modal}>
        <div
          className={styles.close}
          onClick={() => {
            setShowShare(false);
          }}
        >
          <ReactSVG
            src={URL + "editor/icons/close-button.svg"}
            width="16px"
            height="16px"
          />
        </div>
        <div className={styles.emoji}>👋</div>
        <div className={styles.title}>
          {chrome.i18n.getMessage("shareModalSandboxTitle")}
        </div>
        <div className={styles.subtitle}>
          {chrome.i18n.getMessage("shareModalSandboxDescription")}
        </div>
        <div
          className={styles.button}
          onClick={handleUploadVideo}
          style={{
            opacity: (!contentState.mp4ready || contentState.uploading) ? 0.5 : 1,
            cursor: (!contentState.mp4ready || contentState.uploading) ? 'not-allowed' : 'pointer'
          }}
        >
          {contentState.uploading ? "上传中..." : 
           chrome.i18n.getMessage("shareModalSandboxButton")}
        </div>
      </div>
      <div
        className={styles.modalBackground}
        onClick={() => {
          setShowShare(false);
        }}
      ></div>
    </div>
  );
};

export default ShareModal;
