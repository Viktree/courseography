{-# LANGUAGE EmptyDataDecls,
             FlexibleContexts,
             FlexibleInstances,
             GADTs,
             GeneralizedNewtypeDeriving,
             MultiParamTypeClasses,
             OverloadedStrings,
             DeriveGeneric,
             QuasiQuotes,
             TemplateHaskell,
             TypeFamilies,
             DeriveGeneric #-}

{-|
Description: The database schema (and some helpers).

This module defines the database schema. It uses Template Haskell to also
create new types for these values so that they can be used in the rest of
the application.

Though types and typeclass instances are created automatically, we currently
have a few manually-generated spots to clean up. This should be rather
straightforward.
-}

module Database.Tables where

import Database.Persist.TH
import Database.DataType
import qualified Data.Text as T
import qualified Data.Vector as V
import Data.Aeson
import GHC.Generics

-- | A data type representing a list of times for a course.
data Time = Time { timeField :: [Double] } deriving (Show, Read, Eq, Generic)
derivePersistField "Time"

-- | A two-dimensional point.
type Point = (Double, Double)

share [mkPersist sqlSettings, mkMigrate "migrateAll"] [persistLowerCase|
Courses json
    code T.Text
    title T.Text Maybe
    description T.Text Maybe
    manualTutorialEnrolment Bool Maybe
    manualPracticalEnrolment Bool Maybe
    prereqs T.Text Maybe
    exclusions T.Text Maybe
    breadth T.Text Maybe
    distribution T.Text Maybe
    prereqString T.Text Maybe
    coreqs T.Text Maybe
    videoUrls [T.Text]
    deriving Show

Lecture json
    code T.Text
    session T.Text
    section T.Text
    time [Time]
    cap Int
    instructor T.Text
    enrol Int
    wait Int
    extra Int
    timeStr T.Text
    deriving Show

Tutorials
    code T.Text
    section T.Text Maybe
    session T.Text
    times [Time]
    timeStr T.Text
    deriving Show

Breadth
    bId Int
    description String
    deriving Show

Distribution
    dId Int
    description String
    deriving Show

Graph json
    title String
    deriving Show

Text
    graph GraphId
    rId String
    pos Point
    text String
    align String
    fill String
    deriving Show

Shape
    graph GraphId
    id_ String
    pos Point
    width Double
    height Double
    fill String
    stroke String
    text [Text]
    tolerance Double
    type_ ShapeType

Path
    graph GraphId
    id_ String
    points [Point]
    fill String
    stroke String
    isRegion Bool
    source String
    target String
    deriving Show

FacebookTest
    fId String
    testString String
    deriving Show
|]


-- ** TODO: Remove these extra types and class instances

-- | A Tutorial.
data Tutorial =
    Tutorial { tutorialSection :: Maybe T.Text,
               times :: [Time],
               timeStr :: T.Text
             } deriving Show

-- | A Session.
data Session =
    Session { lectures :: [Lecture],
              tutorials :: [Tutorial]
            } deriving (Show, Generic)

-- | A Course.
-- each element of prereqs can be one of three things:
--
--     * a one-element list containing a course code
--     * a list starting with "and", and 2 or more course codes
--     * a list starting with "or", and 2 or more course codes
data Course =
    Course { breadth :: Maybe T.Text,
             description :: Maybe T.Text,
             title :: Maybe T.Text,
             prereqString :: Maybe T.Text,
             fallSession :: Maybe Session,
             springSession :: Maybe Session,
             yearSession :: Maybe Session,
             name :: !T.Text,
             exclusions :: Maybe T.Text,
             manualTutorialEnrolment :: Maybe Bool,
             manualPracticalEnrolment :: Maybe Bool,
             distribution :: Maybe T.Text,
             prereqs :: Maybe T.Text,
             coreqs :: Maybe T.Text,
             videoUrls :: [T.Text]
           } deriving (Show, Generic)

instance ToJSON Course
instance ToJSON Session

instance ToJSON Time where
    toJSON (time) =
        toJSON $ convertTimeToString time

-- instance FromJSON required so that tables can be parsed into JSON,
-- not necessary otherwise.
instance FromJSON Time

instance ToJSON Tutorial where
  toJSON (Tutorial Nothing tutorialTimes tutorialTimeStr) =
      Array $ V.fromList [toJSON (map convertTimeToString tutorialTimes), toJSON tutorialTimeStr]
  toJSON (Tutorial (Just value) tutorialTimes tutorialTimeStr) =
      Array $ V.fromList [toJSON value, toJSON (map convertTimeToString tutorialTimes), toJSON tutorialTimeStr]

-- | Converts a Double to a T.Text.
-- This removes the period from the double, as the JavaScript code,
-- uses the output in an element's ID, which is then later used in
-- jQuery. @.@ is a jQuery meta-character, and must be removed from the ID.
convertTimeToString :: Time -> [T.Text]
convertTimeToString (Time [day, timeNum]) =
  [T.pack . show . floor $ day,
   T.replace "." "-" . T.pack . show $ timeNum]
