import { connect } from 'react-redux';
import React, { Component } from 'react';
import _cloneDeep from 'lodash/cloneDeep';
import PropTypes from 'prop-types';
// import { List, Switch } from 'antd-mobile';
import PlayOperate from '../components/play-operate';
import LrcScroll from '../components/lrc-scroll';
import TimeWrap from '../components/time-wrap';
import { 
  setModeType, setLrcSwitch, 
  setLrcColor, setLock, 
  playSong, togglePlayStatus,
  setCurLrcIndex } from '../store/actions'
import '../less/play-detail.less';

const lrcColorList = [                 // 歌词颜色列表数组
  {
    defaultColor: "#b2f5b5",
    activeColor: "#d1c90e",
    currentImgSrc: "/current-type1.png"
  },
  {
    defaultColor: "#c1f3dc",
    activeColor: "#33a3f5",
    currentImgSrc: "/current-type2.png"
  },
  {
    defaultColor: "#a0f533",
    activeColor: "#f32d2d",
    currentImgSrc: "/current-type3.png"
  },
  {
    defaultColor: "#eff366",
    activeColor: "#21d10e",
    currentImgSrc: "/current-type4.png"
  },
  {
    defaultColor: "#efe8b2",
    activeColor: "#d200d2",
    currentImgSrc: "/current-type5.png"
  }
]
@connect(
  state => ({
    view: state.view,
    audio: state.audio,
    curLrcIndex: state.curLrcIndex,
    curPlaySong: state.curPlaySong,
    songList: state.songList,
    isPlayed: state.isPlayed,
    paused: state.paused,
    curPlayImgSrc: state.curPlayImgSrc,
    curPlayLrcArr: state.curPlayLrcArr,
    lock: state.lock,
    modeType: state.modeType,
    lrcSwitch: state.lrcSwitch
  }),
  dispatch => ({
    togglePlayStatus() { dispatch(togglePlayStatus()) },
    setModeType(modeType) { dispatch(setModeType(modeType)); },
    setLrcSwitch(lrcSwitch) { dispatch(setLrcSwitch(lrcSwitch)); },
    setLrcColor(lrcColor) { dispatch(setLrcColor(lrcColor)); },
    setLock(lock) { dispatch(setLock(lock)); },
    playSong(curPlayIndex) { dispatch(playSong(curPlayIndex)); },
    setCurLrcIndex(curLrcIndex) { dispatch(setCurLrcIndex(curLrcIndex)); },
  })
)
class PlayDetail extends Component {
  static propTypes = {
    showDetail: PropTypes.bool,
    setShowDetail: PropTypes.func.isRequired,
    setCurrentTime: PropTypes.func.isRequired
  }
  static defaultProps = {
    showDetail: false
  }
  constructor() {
    super();
    this.progressTimer = null;        // 控制进度条的定时器
    this.rollTimer = null;            // 控制歌词滚动的定时器
    this.endTime = 0;
    this.progressSpeed = 0;
    this.state = {
      isShowList: false,              // 是否显示歌曲列表
      curPlayTime: 0,                 // 当前播放时间(秒为单位)
      progress: 0,                    // 当前歌曲播放进度     
      translateY: 0,                  // 歌词滚动的距离
      mode: 1,                        // 初始化播放模式的数字
      modeTip: '顺序播放',            // 播放模式提示
      showModeTip: false,             // 是否显示提示
      modeSwitch: false,              // 防止连续点击
      currentImgSrc: "",              // 当前颜色的背景图
      isShowColorList: false,         // 是否显示颜色列表
      defaultColor: "",               // 当前默认所有歌词颜色
      activeColor: "",                // 当前播放所属行的歌词颜色
    }
    this.changeLrcColor = this.changeLrcColor.bind(this);
    this.switchMode = this.switchMode.bind(this);
    this.toggleLrcSwitch = this.toggleLrcSwitch.bind(this);
  }
  componentWillMount() {
    this.init();
  }
  componentWillReceiveProps(nextProps) {
    if(this.props.isPlayed !== nextProps.isPlayed) {
      if(nextProps.isPlayed) {
        this.initPlay(nextProps);
      }
    }
    if(this.props.paused !== nextProps.paused) {
      if(nextProps.paused) {
        this.clearTimer();
      }
      else {
        this.progressTimer = setTimeout(() => {
          this.progressGo();
        }, 1000);
        this.rollTimer = setTimeout(() => {
          this.lrcRoll(nextProps);
        }, 100);
      }
    }
  }
  // 根据localStorage中的数据初始化播放信息
  init() {
    let mode = 1;
    let { currentColorObj, modeType, lrcSwitch } = window.localStorage;
    if(currentColorObj) {
      currentColorObj = JSON.parse(currentColorObj);
    }
    else {
      currentColorObj = _cloneDeep(lrcColorList[0]);
    }
    if(!modeType) {
      modeType = "order";
    }
    if(modeType === "loop") {
      mode = 2;
    }
    else if(modeType === "random") {
      mode = 3;
    }
    if(lrcSwitch === 'false') {
      lrcSwitch = false;
    }
    else {
      lrcSwitch = true
    }
    this.props.setModeType(modeType);
    this.props.setLrcSwitch(lrcSwitch);
    this.props.setLrcColor({
      defaultColor: currentColorObj.defaultColor,
      activeColor: currentColorObj.activeColor
    });
    this.setState({
      mode,
      currentImgSrc: currentColorObj.currentImgSrc,
      defaultColor: currentColorObj.defaultColor,
      activeColor: currentColorObj.activeColor
    });
  }
  // 初始化播放信息
  initPlay(nextProps) {
    this.endTime = parseInt(nextProps.audio.duration);
    this.progressSpeed = Number((100 / this.endTime).toFixed(2));
    this.props.setCurrentTime.bind(this, 0);
     this.setState({
      progress: 0,
      curPlayTime: 0
    });
    if(this.progressTimer) {
      this.clearTimer();
    }
    this.progressGo(); 
    this.lrcRoll(nextProps);
  }
  // 时间进度条前进
  progressGo() {
    this.setState(prevState => ({
      curPlayTime: prevState.curPlayTime + 1,
      progress: prevState.progress + this.progressSpeed
    }));
    if(this.state.progress < 100) {
      this.progressTimer = setTimeout(() => {
        this.progressGo();
      }, 1000);
    }
    else {
      this.setState({
        progress: 100,
        curPlayTime: this.endTime
      });
      this.dealMode();
    }
  }
  // 歌词滚动
  lrcRoll(nextProps) {
    const curPlayLrcArr = _cloneDeep(nextProps.curPlayLrcArr);
    const currentTime = Number(nextProps.audio.currentTime.toFixed(2));
    for(let [index, curPlayLrc] of curPlayLrcArr.entries()) {
      if(Number(curPlayLrc.startTime) >= currentTime) {
        if(index === 0) {
          index = 1;
        }
        else if(index === curPlayLrcArr.length - 1) {
          index = curPlayLrcArr.length - 1;
        }
        this.translateLrc(index - 1);
        break;
      }
      else {
        this.translateLrc(curPlayLrcArr.length - 1);
      }
    }
    if(currentTime < this.endTime) {
      this.rollTimer = setTimeout(() => {
        this.lrcRoll(nextProps);
      }, 100);
    }
    else {
      return;
    }
  }
  // 根据当前高亮歌词行的索引值来计算滚动的距离
  translateLrc(newCurLrcIndex) {
    this.props.setCurLrcIndex(newCurLrcIndex);
    if(!this.props.showDetail) return;
    
    const prevTranslateY = this.state.translateY;
    const lrcBoxHeight = this.lrcBox.offsetHeight;
    const childHeight = this.lrcBox.firstChild.offsetHeight;
    const curShowNum = Math.floor(lrcBoxHeight / childHeight);
    const nextTranslateY = childHeight * (newCurLrcIndex - curShowNum + 1);
    console.log(prevTranslateY, nextTranslateY);
    if(newCurLrcIndex >= curShowNum - 1) {
      this.setState({
        translateY: childHeight * (newCurLrcIndex - curShowNum + 1)
      });
    }                              
    else {
      this.setState({
        translateY: 0
      });
    }
  }
  // 点击进度条更新时间
  updateProgress(evt) {
    /*
     * 这里不能写 const offsetX = evt.offsetX
     * 不知是什么原因获取不到
     */
    const parentOffsetLeft = this.progressBar.parentNode.offsetLeft;
    const offsetX = evt.pageX - parentOffsetLeft;
    const targetWidth = this.progressBar.offsetWidth;
    const newProgress = Number((offsetX / targetWidth * 100).toFixed(2));
    const newCurPlayTime = parseInt((this.endTime * newProgress / 100).toFixed(2));
    this.setState({
      progress: newProgress,
      curPlayTime: newCurPlayTime
    });
    this.props.setCurrentTime(newCurPlayTime)
    this.props.setLock(true);
  }
  // 切换播放模式
  switchMode() {
    const { modeSwitch, mode, showModeTip, modeTip } = this.state;
    if(modeSwitch) return;

    let modeType = "";
    let loop = false;
    this.mode++;
    this.modeSwitch = true;
    this.showModeTip = true;
    if(this.mode % 3 === 1) {
      this.modeTip = "顺序播放";
      modeType = "order";
    }
    else if (this.mode % 3 === 2) {
      this.modeTip = "循环播放";
      modeType = "loop";
      loop = true;
    }
    else {
      this.modeTip = "随机播放";
      modeType = "random";
    }
    this.$store.commit("setLoop", loop);
    this.$store.commit("setModeType", modeType);
    window.localStorage.modeType = modeType;
    setTimeout(() => {
      this.modeSwitch = false;
      this.showModeTip = false;
    }, 3000);
  }
  // 歌曲结束时根据播放模式来处理
  dealMode() {
    this.props.setLock(false);
    if(this.modeType === "random") {
      const randomIndex = Math.floor(Math.random() * this.listTotal);
      this.props.playSong(randomIndex)
    }
    else if(this.modeType === "loop") {
      this.initPlay();
    }
  }
  // 清除定时器
  clearTimer() {
    clearTimeout(this.progressTimer);
    clearTimeout(this.rollTimer);
  }
  // 点击列表时播放歌曲
  playSong(CurPlayIndex) {
    this.props.playSong(CurPlayIndex);
    this.isShowList = false;
  }
  // 点击改变歌词颜色
  changeLrcColor(index) {
    const currentItem = _cloneDeep(lrcColorList[index]);
    this.currentImgSrc = currentItem.currentImgSrc;
    this.defaultColor = currentItem.defaultColor;
    this.activeColor = currentItem.activeColor;
    this.isShowColorList = false;
    const currentColorObj = {
      currentImgSrc: this.currentImgSrc,
      defaultColor: this.defaultColor,
      activeColor: this.activeColor
    }
    this.$store.commit('setLrcColor', {
      defaultColor: this.defaultColor,
      activeColor: this.activeColor
    });
    // 存入localStorage中
    window.localStorage.currentColorObj = JSON.stringify(currentColorObj);
  }
  // 悬浮歌词开关
  toggleLrcSwitch(lrcSwitch) {
    lrcSwitch = !lrcSwitch;
    this.props.setLrcSwitch(lrcSwitch)
  }
  render() {
    const { 
      curPlaySong, curPlayImgSrc, 
      curPlayLrcArr, modeType, 
      showDetail, paused, curLrcIndex } = this.props;
    const { 
      modeTip, isShowList, translateY, 
      defaultColor, activeColor, 
      curPlayTime, progress, showModeTip, 
      currentImgSrc, isShowColorList } = this.state;

    // 传递给 PlayOperate 组件的props
    const playOperateProps = {
      paused,
      showDetail,
      curPlaySong,
      togglePlayStatus: this.props.togglePlayStatus,
      playSong: this.props.playSong
    }
    // 传递给 LrcScrollP 组件的props
    const lrcScrollProps = {
      curPlayLrcArr,
      translateY,
      defaultColor,
      activeColor,
      curLrcIndex,
      lrcBoxRef: el => this.lrcBox = el
    }
    // 传递给 TimeWrap 组件的props
    const TimeWrapProps = {
      curPlayTime,
      progress,
      endTime: this.endTime,
      updateProgress: this.updateProgress.bind(this),
      progressBarRef: el => this.progressBar = el
    }
    return (
      <div id = 'playDetail' className = { showDetail ? 'slideIn' : '' } style = {{ backgroundImage: 'url(' + curPlayImgSrc + ')' }}>
        <div className = "playDetail-mark"></div>
        <div className = "playDetail-top">
          <div className = "goback" onClick = { this.props.setShowDetail.bind(this, false) }></div>
          <div className = "playDetail-title">{ curPlaySong.FileName }</div>
        </div>
        <div className = "playDetail-center">
          { /* 歌词滚动组件 */ }
          <LrcScroll { ...lrcScrollProps }></LrcScroll>
        </div>
        <div className = "playDetail-bottom">
          <div className = "lrc-switch">

          </div>
          <div className = "lrcColor-box">
            <div className = "cur-lrcColor" style = {{ backgroundImage: 'url('+ currentImgSrc +')' }}></div>
            { 
              isShowColorList ? (<div className = "color-list"> {
                lrcColorList.map((currentObj, index) => {
                  return (
                    <li key = { index } style = {{ backgroundImage: 'url('+ currentObj.currentImgSrc +')' }} onClick = { this.changeLrcColor(index) }>
                    </li>
                  );
                })
              }</div>) : null
            }
          </div>
          { /* 时间进度条组件 */ }
          <TimeWrap { ...TimeWrapProps }></TimeWrap>
          <div className = "play-operateBox">
            <div className = { 'listen-mode order-play ' + modeType + '-play' } onClick = { this.switchMode }>
              { showModeTip ? <div className = "mode-tip">{ modeTip }</div> : null }
            </div>
            <PlayOperate { ...playOperateProps }></PlayOperate>
            <div className = "list-detail">
              <div className = { isShowList ? 'icon-list active-list' : 'icon-list' }></div>
              {
                isShowList ? (<div className = "play-list">
                  <ul>
                    { songList.map((song, index) => {
                      return (
                        <li key = { index } className = { curPlaySong.index === index ? 'active' : '' } onClick = "playSong(index)">
                          { index + 1 }. { song.FileName }
                        </li>
                      );
                    }) }
                  </ul>
                </div>) : null
              }
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default PlayDetail;