import React from 'react';
import ChapterImage from '../../components/js/ChapterImage.js';
import { Carousel } from 'react-responsive-carousel';
import { withRouter } from 'react-router-dom';
import { InView } from 'react-intersection-observer';
import Loader from '../../components/js/Loader.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCog } from '@fortawesome/free-solid-svg-icons';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { faStepBackward } from '@fortawesome/free-solid-svg-icons';
import { faStepForward } from '@fortawesome/free-solid-svg-icons';
import BackButton from '../../components/js/BackButton.js';
import CheckButton from '../../components/js/CheckButton.js';
import { Line } from 'rc-progress';
import Modal from 'react-modal';
import ErrorMessage from '../../components/js/ErrorMessage.js';
import { Helmet } from "react-helmet";
import localForage from 'localforage';
import "react-responsive-carousel/lib/styles/carousel.min.css";
import '../css/ChapterPage.css';

class ChapterPage extends React.Component {
	constructor() {
		super();
		this.state = {
			manga: {},
			chapterIndex: 0,
			chapterImages: [],
			chapterNumber: '',
			defaultPage: 1,
			nextChapter: [],
			prevChapter: [],
			chapterTitle: '',
			mangaName: '',
			progress: 0,
			headerActive: false,
			view: 'horizontal',
			background: 'light',
			readMode: 'normal',
			settings: false,
			loader: true,
			modalOpen: false,
			currentImage: [],
			modalColor: '#000',
			modalBG: 'rgba(255, 255, 255, 0.8)',
			networkError: false
		}
	}

	componentDidMount() {
		//check if default preferences have been set beforehand
		localForage.getItem('userPreferences')
			.then(value => {
				if (value !== null) {
					this.setState({
						view: value.readView,
						background: value.readBG,
						readMode: value.readMode
					})
				}
				console.log(value);
			})
			.catch(err => console.log(err));
		this.fetchData();
	}

	fetchData = () => {
		const { id, mangaid, number } = this.props.match.params;

		//check if user came from history page and parse page num from url
		const url = new URL(window.location.href);
		let pageNum = 1;
		if (url.search !== '') {
			let searchParams = new URLSearchParams(url.search);
			pageNum = searchParams.get('q').trim();
		}

		this.setState({ 
			chapterNumber: number, 
			networkError: false,
			defaultPage: Number(pageNum)
		})

		fetch(`https://www.mangaeden.com/api/chapter/${id}`)
			.then(res => res.json())
			.then(data => {
				data.images.reverse();
				this.setState({ 
					chapterImages: data.images,
					currentImage: data.images[pageNum-1],
					networkError: false
				})
			})
			.catch(err => this.setState({ networkError: true }));

		fetch(`https://www.mangaeden.com/api/manga/${mangaid}`)
			.then(res => res.json())
			.then(data => {
				let index;
				//to find the current chapter array in the manga chapters
				for (let i = 0; i < data.chapters.length; i++) {
					if (data.chapters[i][0] === Number(number)) {
						index = i;
						break;
					} 
				}
				this.setState({
					manga: data,
					mangaName: data.title,
					chapterTitle: data.chapters[index][2],
					loader: false,
					chapterIndex: index,
					networkError: false
				})

				this.saveToHistory(data);
				this.updateMangaCatalog(1, false, data);
				//conditions for whether there's a next/prev chapter
				if ((index - 1) === -1) {
					this.setState({ 
						nextChapter: null,
						prevChapter: [data.chapters[index+1][0], data.chapters[index+1][2], data.chapters[index+1][3]] 
					})
				} else if ((index + 1) === data.chapters.length) {
					this.setState({ 
						prevChapter: null,
						nextChapter: [data.chapters[index-1][0], data.chapters[index-1][2], data.chapters[index-1][3]]
					})
				} else if (data.chapters.length === 1) {
					this.setState({
						nextChapter: null,
						prevChapter: null
					})
				} else {
					this.setState({
						nextChapter: [data.chapters[index-1][0], data.chapters[index-1][2], data.chapters[index-1][3]],
						prevChapter: [data.chapters[index+1][0], data.chapters[index+1][2], data.chapters[index+1][3]],
					})
				}
				console.log(data);
			})
			.catch(err => this.setState({ networkError: true }));
	}

	calcProgress = (current, total) => {
		let progress = Math.round((current / total) * 100);
		if (progress !== this.state.progress) this.setState({ progress });
	}

	toggleVertical = () => this.setState({ view: 'vertical' })

	toggleHorizontal = () => this.setState({ view: 'horizontal' })

	toggleNormal = () => this.setState({ readMode: 'normal' })
	
	toggleWebtoon = () => this.setState({ readMode: 'webtoon' })

	toggleDark = () => {
		this.setState({ 
			background: 'dark',
			modalColor: '#fff',
			modalBG: 'rgba(0, 0, 0, 0.8)'
		})
	}

	toggleLight = () => {
		this.setState({ 
			background: 'light',
			modalColor: '#000',
			modalBG: 'rgba(255, 255, 255, 0.8)'
		})
	}

	displaySettings = () => this.setState({ settings: !this.state.settings })

	displayNextChapter = () => {
		const { mangaid, name } = this.props.match.params;
		const { nextChapter } = this.state;
		this.props.history.push(`/${name}/${mangaid}/chapter/${nextChapter[0]}/${nextChapter[2]}`);
		window.location.reload();
	}

	displayPrevChapter = () => {
		const { mangaid, name } = this.props.match.params;
		const { prevChapter } = this.state;
		this.props.history.push(`/${name}/${mangaid}/chapter/${prevChapter[0]}/${prevChapter[2]}`)
		window.location.reload();
	}

	saveToHistory = (manga) => {
		const { id, mangaid, number } = this.props.match.params;
		//fetch history from storage
		localForage.getItem('readHistory')
			.then(value => {
				if (value === null) {
					let recentManga = [];
					recentManga.push({
						alias: manga.alias,
						image: manga.image,
						mangaId: mangaid,
						title: manga.title,
						chapterNum: number,
						chapterId: id,
						page: 1,
						added: new Date().getTime()
					});

					localForage.setItem('readHistory', recentManga)
						.then(value => console.log(value))
						.catch(err => console.log(err));
				} else {
					//check if manga already exists in history
					let mangaPresent = false;
					for (let i = 0; i < value.length; i++) {
						if (value[i].chapterId === id) {
							value[i].chapterNum = number;
							value[i].added = new Date().getTime();
							mangaPresent = true;
							break;
						}
					};
					if (!mangaPresent) {
						value.push({
							alias: manga.alias,
							image: manga.image,
							mangaId: mangaid,
							title: manga.title,
							chapterNum: number,
							chapterId: id,
							page: 1,
							added: new Date().getTime()
						})
					};
					localForage.setItem('readHistory', value)
						.then(value => console.log(value))
						.catch(err => console.log(err));
				}
			})
			.catch(err => console.log(err));
	}

	updateMangaCatalog = (index, completed, manga) => {
		const { chapterIndex } = this.state;
		localForage.getItem('offlineManga')
			.then(allManga => {
				//add new manga to catalog
				const addNewManga = (allManga, currentManga) => {
					currentManga.chapters[chapterIndex][4] = index;
					if (!currentManga.chapters[chapterIndex][5]) currentManga.chapters[chapterIndex][5] = completed;
					allManga.push(currentManga);
					localForage.setItem('offlineManga', allManga)
						.then(value => console.log(value))
						.catch(err => console.log(err));
				}
				if (allManga !== null) {
					let mangaPresent = false;
					let mangaIndex;
					for (let i = 0; i < allManga.length; i++) {
						if (allManga[i].title === manga.title) {
							mangaPresent = true;
							mangaIndex = i;
							break;
						}
					}
					if (!mangaPresent) addNewManga(allManga, manga);
					else {
						//update manga if its already existing in catalog
						allManga[mangaIndex].chapters[chapterIndex][4] = index;
						if (!allManga[mangaIndex].chapters[chapterIndex][5]) allManga[mangaIndex].chapters[chapterIndex][5] = completed;
						localForage.setItem('offlineManga', allManga)
							.then(value => console.log(value))
							.catch(err => console.log(err));
					}
				} else {
					let allManga = [];
					addNewManga(allManga, manga);
				}
			})
			.catch(err => console.log(err))
	}

	updatePageNumber = (index) => {
		const { manga } = this.state;
		localForage.getItem('readHistory')
			.then(recentManga => {
				if (recentManga !== null) {
					for (let i = 0; i < recentManga.length; i++) {
						if (recentManga[i].alias === manga.alias) {
							recentManga[i].page = index;
						}
					}
					localForage.setItem('readHistory', recentManga)
						.then(value => console.log(value))
						.catch(err => console.log(err))
				}
			})
			.catch(err => console.log(err));
	}

	render() {	
		Modal.setAppElement('#root');
		const { background, chapterNumber, chapterTitle, nextChapter, prevChapter, chapterImages, modalColor, modalBG, mangaName, defaultPage } = this.state;
		return (
			<div className='chapter-page'>
				<Helmet>
   					<title>{`${mangaName} - Chapter ${chapterNumber} - MangaHaven`}</title>
    				<meta name='theme-color' content={background === 'light' ? '#fff' : '#000'} />
				</Helmet>
				{
					!this.state.networkError ?
					<div className='chapter-page-inner'>
						<div className={this.state.headerActive ? 'active chapter-page-header' : 'chapter-page-header'}>
							<BackButton clickAction={() => this.props.history.goBack()} />
							<div className='header-title'>
								<p className='manga-title'>{mangaName}</p>
								<p className='chapter-number'>{`${chapterNumber}${chapterTitle !== null ? `: ${chapterTitle}` : ''}`}</p>
							</div>
							<FontAwesomeIcon icon={faCog} onClick={this.displaySettings} />
						</div>
						<div className={this.state.headerActive ? 'active chapter-page-footer' : 'chapter-page-footer'}>
							<FontAwesomeIcon 
								icon={faStepBackward} 
								onClick={this.displayPrevChapter}
							/>
							<Line percent={this.state.progress} strokeWidth='2.5' strokeColor='#d3d3d3' />
							<FontAwesomeIcon 
								icon={faStepForward} 
								onClick={this.displayNextChapter}
							/>
						</div>
						<div 
							className=
								{
									this.state.settings ? 
									`block-active chapter-page-settings` : 
									`chapter-page-settings`
								}
							onClick={this.displaySettings}
						>
							<div 
								className={`${background} chapter-page-settings-inner`}
								onClick={e => e.stopPropagation()}
							>
								<div className='chapter-view'>
									<p>View</p>
									<div className='options'>
										<div className='horizontal-option' onClick={this.toggleHorizontal}>
											<CheckButton 
												classname='horizontal'
												view={this.state.view}
											/>
											<span>Horizontal</span>
										</div>

										<div className='vertical-option' onClick={this.toggleVertical}>
											<CheckButton 
												classname='vertical' 
												view={this.state.view} 
											/>
											<span>Vertical</span>
										</div>
									</div>
								</div>

								<div className='background-settings'>
									<p>Background</p>
									<div className='options'>
										<div className='background-light' onClick={this.toggleLight}>
											<CheckButton 
												classname='light' 
												view={background} 
											/>
											<span>Light</span>
										</div>
										<div className='background-dark' onClick={this.toggleDark}>
											<CheckButton 
												classname='dark' 
												view={background} 
											/>
											<span>Dark</span>
										</div>
									</div>
								</div>

								<div className='reading-mode'>
									<p>Mode</p>
									<div className='options'>
										<div className='normal-option' onClick={this.toggleNormal}>
											<CheckButton 
												classname='normal' 
												view={this.state.readMode} 
											/>
											<span>Normal</span>
										</div>
										<div className='webtoon-option' onClick={this.toggleWebtoon}>
											<CheckButton 
												classname='webtoon' 
												view={this.state.readMode} 
											/>
											<span>Webtoon</span>
										</div>
									</div>
								</div>
							</div>
						</div>
						
						{
							this.state.loader ? <Loader background={background} /> :
							<Carousel 
								showIndicators={false}
								showThumbs={false}
								axis={this.state.view}
								verticalSwipe={'standard'}
								onClickItem={() => this.setState({headerActive: !this.state.headerActive})}
								useKeyboardArrows={true}
								emulateTouch={true}
								swipeable={true}
								selectedItem={defaultPage}
								statusFormatter={(current, total) => {
									this.calcProgress(current, total);
									return `Page ${current-1} of ${total-2}`;
								}}
								onChange={index => {
										let completed = false;
										if (index === chapterImages.length) completed = true;
										if (index !== 0 && index !== (chapterImages.length + 1)) {
											this.setState({ currentImage: chapterImages[index-1] })
											this.updateMangaCatalog(index, completed, this.state.manga);
											this.updatePageNumber(index);
										}
									}
								}
							>
								{/* To notify if there's a previous chapter */}
								<div className={`notify-chapter previous ${background}`}>
									{
										this.state.prevChapter !== null ?
										<div>
											<p>Current:</p>
											<span>{`${chapterNumber}${chapterTitle !== null ? `: ${chapterTitle}` : ''}`}</span>

											<p>Previous: </p>
											<span>{`${prevChapter[0]}${prevChapter[1] !== null ? `: ${prevChapter[1]}` : ''}`}</span>
											<button
												className={background}
												onClick={this.displayPrevChapter}
											>
												{`Read Chapter ${prevChapter[0]}`}
											</button>
										 </div> 
										: 
										<p className='no-chapter'>There's no previous chapter</p>
									}
								</div>

								{
									chapterImages.map((image, id) => {
										return (
												<InView key={id}>
													{
														({ inView, ref, entry }) => {
															return (
																	<div 
																		className={inView ? `${background} chapter-image` : `${background} chapter-image loading`} 
																		key={id} 
																		ref={ref}
																		onDoubleClick={() => {
																				this.setState({ 
																					modalOpen: true,
																					headerActive: false
																				})
																			}
																		}
																	>
																		<ChapterImage 
																			url={inView ? `https://cdn.mangaeden.com/mangasimg/${image[1]}` : ''}	
																		/>

																	</div>
															)
														}
													}
												</InView>
										)
									})
								}

								{/* To notify if there's a next chapter */}
								<div className={`notify-chapter next ${background}`}>
									{
										this.state.nextChapter !== null ?
										<div>
											<p>Current:</p>
											<span>{`${chapterNumber}${chapterTitle !== null ? `: ${chapterTitle}` : ''}`}</span>

											<p>Next:</p>
											<span>{`${nextChapter[0]}${nextChapter[1] !== null ? `: ${nextChapter[1]}` : ''}`}</span>
											<button 
												className={background} 
												onClick={this.displayNextChapter}
											>
												{`Read Chapter ${nextChapter[0]}`}
											</button>
										</div>
										: 
										<p className='no-chapter'>There's no next chapter</p>
									}
								</div>
							</Carousel> 
						}
						{/* modal for displaying images to allow zoom and download */}
						<Modal
							style={{
								overlay: {
									zIndex: 3,
									backgroundColor: modalBG
								},
								content: {
									padding: '0px',
									inset: '30px 10px 10px 10px',
									color: modalColor,
									top: '30px',
									bottom: '10px',
									right: '10px',
									left: '10px'
								}
							}}
							isOpen={this.state.modalOpen}
							onRequestClose={() => {this.setState({ modalOpen: false })}}
						>
							<FontAwesomeIcon 
								onClick={() => {this.setState({ modalOpen: false })}} 
								icon={faTimes} 
								style={{
									position: 'fixed',
									top: '0',
									right: '0',
									height: '28px',
									width: '28px',
									margin: '2px 5px 2px 0'
								}}
							/>
							<div>
								<ChapterImage url={`https://cdn.mangaeden.com/mangasimg/${this.state.currentImage[1]}`} />
							</div>
						</Modal> 
					</div> :
					<ErrorMessage renderList={this.fetchData} />
				}
			</div>
		)
	}
}

export default withRouter(ChapterPage);