/* Array utilities */
function inArray(item, array) {
    'use strict';

    return $.inArray(item, array) > -1;
}


function removeFromArray(item, array) {
    'use strict';

    var index = array.indexOf(item);
    array.splice(index, 1);
    return index;
}


/* These specifically manipulate the two global arrays,
courseObjects and selectedLectures. */
function removeCourseObject(courseName) {
    'use strict';

    for (var i = 0; i < courseObjects.length; i++) {
        if (courseName === courseObjects[i].name) {
            courseObjects.splice(i, 1);
            break;
        }
    }
}


function getCourseObject(courseName, courseArray) {
    'use strict';

    for (var i = 0; i < courseArray.length; i++) {
        if (courseArray[i].name === courseName) {
            return courseArray[i];
        }
    }
    return undefined;
}


function updateSelectedLectures(section) {
    'use strict';

    if (!inArray(section.id, selectedLectures)) {
        selectedLectures.push(section.id);
    }
}


/* AJAX Functions */
function getVeryLargeCourseArray() {
    'use strict';

    var splitArray = undefined;

    $.ajax({
        url: "res/courses.txt",
        dataType: "text",
        async: false,
        success: function (data) {
            splitArray = data.split('\n').map(function (course) {
                return course.substring(0, 8);
            });
        }
    });

    return splitArray;
}


function fetchCourse(name) {
    'use strict';

    var course;
    $.ajax({
        url: 'res/courses/' + name + '.txt',
        dataType: 'json',
        async: false,
        success: function (data) {
            course = data;
        },
        error: function () {
            throw 'No course file';
        }
    });
    courseCache.push(course);
    return course;
}


function getCourse(name) {
    'use strict';

    var course = getCourseObject(name, courseCache);
    if (course === undefined) {
        course = fetchCourse(name);
    }
    return course;
}


/* Timetable Search List */
function enableSearch() {
    'use strict';

    $('#course-filter').keyup(function() {
        resetSearchList();
    });
}


function resetSearchList() {
    'use strict';

    var searchListObject = $('#search-list');

    var filter = $('#course-filter').val().toUpperCase();
    searchListObject.empty();
    var courseList = document.createElement('ul');
    if (filter !== '') {
        $.each(courses, function(i, course) {
            var counter = 0;

            // If the course matches and if there are fewer than
            // 100 courses in the list, add it to the list.
            if (course.indexOf(filter) > -1 && counter < 100) {
                var courseEntry = document.createElement('li');

                // Add an ID to the list so we can come back and star
                // it when it is clicked.
                $(courseEntry).attr('id', course + '-search')
                              .html(course)
                              .click(function() {
                                   $(this).toggleClass('starred-course');
                                   if (inArray(course, selectedCourses)) {
                                       removeCourseFromList(course);
                                   } else {
                                       addCourseToList(course);
                                   }
                               })
                               .mouseover(function() {
                                   var courseResult = getCourse(course);
                                   renderDisplayCourseTitle(courseResult);
                               })
                               .mouseout(function() {
                                   renderClearCourseInformation();
                               });

                counter++;
                courseList.appendChild(courseEntry);
            }
        });
    }
    searchListObject.append(courseList);
    refreshStarredCourses();
}


// Highlight starred (selected) courses in search list
function refreshStarredCourses() {
    'use strict';

    $('#search-list').find('li').each(function (index) {
        var course = $(this).text();
        if (inArray(course, selectedCourses)) {
            $(this).addClass('starred-course');
        } else {
            $(this).removeClass('starred-course');
        }
    });
}

/* Cookie Interaction */
function restoreFromCookies() {
    'use strict';

    var starredCourseCookie = getCookie('selected-courses');
    var starredLectureCookie = getCookie('selected-lectures');

    if (starredCourseCookie.length === 0) {
        starredCourseCookie = [];
    }

    if (starredLectureCookie.length === 0) {
        starredLectureCookie = [];
    }

    if (starredCourseCookie.length > 0) {
        var selectedCoursesTemp = $.parseJSON(starredCourseCookie);
        var newCourses = [];
        $.each(selectedCoursesTemp, function (i, course) {
            try {
                addCourseToList(course);
                newCourses.push(course);
            } catch (e) {
                console.log('Removed bad course from cookie: ' + course);
                console.log(e);
            }
        });
    }

    if (starredLectureCookie.length > 0) {
        selectedLectures = $.parseJSON(starredLectureCookie);
        var newSections = [];
        $.each(selectedLectures, function (i, section) {
            try {
                $('#' + section).click();
                newSections.push(section);
            } catch (e) {
                console.log('Removed bad section from cookie: ' + section);
            }

        });
    }

    saveCookies(newCourses, newSections);
}


function saveCookies(courses, sections) {
    'use strict';

    setCookie('selected-courses', JSON.stringify(courses));
    setCookie('selected-lectures', JSON.stringify(sections));
}


// Used to determine if course requires manual practical enrolment
function hasManualPractical(section) {
    'use strict';

    return (section[0].charAt(0) === 'P');
}


// Used to determine if course requires manual tutorial enrolment
function hasManualTutorial(section) {
    'use strict';

    return (section[0].charAt(0) === 'T');
}


function addCourseToList(name) {
    'use strict';

    var course = new Course(name);
    $('#course-select').append(course.render());
    courseObjects.push(course);
    selectedCourses.push(name);
    saveCookies(selectedCourses, selectedLectures);
}


function removeCourseFromList(name) {
    'use strict';

    var courseSelector = '#' + name + '-li';
    var courseElement = $(courseSelector);
    $(courseSelector + ' li[clicked*="true"]').each(function() {
        $(this).click();
    });
    courseElement.remove();

    // Remove course from memory
    removeCourseObject(name);
    removeFromArray(name, selectedCourses);

    saveCookies(selectedCourses, selectedLectures);

    // Refresh starred courses
    refreshStarredCourses();
}


/* Info box */
function renderDisplayCourseTitle(course) {
    'use strict';

    renderDisplayCourseInformation(course);
    $('#section-stats-section').empty();
    $('#section-stats-instructor').empty();
    $('#section-stats-enrol').empty();
}


function renderDisplayCourseInformation(course) {
    'use strict';

    $('#course-info-code').html(course.name);
    $('#course-info-title').html(course.title);
}


function renderDisplaySectionInformation(section) {
    'use strict';

    $('#section-stats-section').html(section.name);
    $('#section-stats-instructor').html(section.instructor);
    var cap = section.cap;
    var enrol = section.enrol;
    var wait = section.wait;
    if (cap !== undefined && enrol !== undefined) {
        var enrolString = (cap - enrol) + ' out of ' + cap +
            ' spots remaining';
        if (wait !== undefined && wait !== 0) {
            enrolString += '; ' + wait + ' students on the waitlist';
        }
        $('#section-stats-enrol').html(enrolString);
    }
}


function renderClearCourseInformation() {
    'use strict';

    $('#course-info-code').empty();
    $('#course-info-title').empty();
    $('#section-stats-section').empty();
    $('#section-stats-instructor').empty();
    $('#section-stats-enrol').empty();
}


// Parse times for cell ids.
function convertTimes(times) {
    'use strict';

    var timeList = [];
    var time;

    for(var i = 0; i < times.length; i++) {
        var timeString = 'MTWRF'.charAt(times[i][0]);
        time = times[i][1];
        timeString = timeString + time;
        timeList.push(timeString);
    }

    return timeList;
}
