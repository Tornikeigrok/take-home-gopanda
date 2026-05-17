import React from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import { getUrl } from "./ApiCall";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

//--- Interface for the result of returning all rooms
interface roomsRule {
  name: string;
  capacity: number;
  purpose: string;
  is_active: boolean;
  created_at: string;
  id: number;
  status: "confirmed" | "tentative" | string | null;
}

//--- Interface for the result of returning scheduled rooms
interface bookingRule {
  id: number;
  room_id: number;
  user_id: number;
  start_time: string;
  end_time: string;
  status: "confirmed" | "tentative" | string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

interface scheduleInfoRule {
  success: boolean;
  room_schedule_details: bookingRule[];
}

interface UserInfo {
  userEml?: string;
  userName?: string;
}

export const Dashboard = () => {
  const navigate = useNavigate();

  //--- Ensure user has a valid token
  useEffect(() => {
    const token = Cookies.get("access-token");
    if (!token) {
      navigate("/");
    }
  }, []);
 

  //--- This API returns the current user's details to display and use for profile
  const [userInfo, setUserInfo] = useState<UserInfo | undefined>();
  useEffect(() => {
    const currentUserInfo = async () => {
      const token = Cookies.get("access-token");
      try {
        const res = await fetch(getUrl("userInfo"), {
          method: "GET",
          headers: { Authorization: "Bearer " + token },
        });
        if (res.status === 401) {
          Cookies.remove("access-token");
          toast.error("Session expired. Please log in again.");
          navigate("/");
          return;
        }
        if (!res.ok) {
          toast.error("Couldn't load your profile.");
          return;
        }
        const data = await res.json();
        setUserInfo(data);
      } catch (error) {
        console.error(error);
        toast.error("Network error. Check your connection.");
      }
    };
    currentUserInfo();
  }, []);



  //--- API call to fetch every room to display
  const [rooms, setRooms] = useState<roomsRule[]>([]);
  useEffect(() => {
    const displayAllRooms = async () => {
      const token = Cookies.get("access-token");
      try {
        const res = await fetch(getUrl("roomList"), {
          method: "GET",
          headers: { Authorization: "Bearer " + token },
        });
        if (res.status === 401) {
          Cookies.remove("access-token");
          toast.error("Session expired. Please log in again.");
          navigate("/");
          return;
        }
        if (!res.ok) {
          toast.error("Couldn't load rooms. Please try again.");
          return;
        }
        const data = await res.json();
        console.log(data);
        setRooms(data.rooms);
      } catch (error) {
        console.error(error);
        toast.error("Network error. Check your connection.");
      }
    };
    displayAllRooms();
  }, []);


  //--- This API returns the details for a specific, selected room, particularly details like schedules,  status, expiry date, etc
  const [openDetailsModal, setOpenDetailsModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<roomsRule | null>(null);
  const [roomSchedule, setRoomSchedule] = useState<scheduleInfoRule | null>(null);

  //--- Prevent scroll while the schedule modal is displaying ---//
  useEffect(()=>{
    document.body.style.overflow = openDetailsModal ? 'hidden' : '';
    if (!openDetailsModal) {
      setSuccessfulReq(false);
      setRequesting(false);
      setTimeConflict(false);
      setConflicts([]);
      setConfirmedBooking(false);
    }
    return() => {document.body.style.overflow = ''}
  }, [openDetailsModal]);
  

  //--- These are states for date, start_time, and end_time the user has selected
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");

  //--- Return schedule details ---//
  const roomDetails = async(id: number)=>{
    const token = Cookies.get('access-token');
    try {
        const res = await fetch(getUrl(`roomScheduleInfo/${id}`), {
          method: "GET",
          headers: { Authorization: "Bearer " + token },
        });
        if (res.status === 401) {
          Cookies.remove("access-token");
          toast.error("Session expired. Please log in again.");
          navigate("/");
          return;
        }
        if (!res.ok) {
          toast.error("Couldn't load room schedule.");
          return;
        }
        const data = await res.json();
        console.log(data);
        setRoomSchedule(data);
      } catch (error) {
        console.error(error);
        toast.error("Network error. Check your connection.");
      }
  }

 // --- This is the call to request a room booking ---//
 const [successfulReq, setSuccessfulReq] = useState(false);
 const [timeConflict, setTimeConflict] = useState(false);
 const [conflicts, setConflicts] = useState<bookingRule[]>([]);
 const [requesting, setRequesting] = useState(false);
 const [confirmDate, setConfirmDate] = useState(Date.now());
 const [now, setNow] = useState(Date.now());

 const [tentativeRoomId, setTentativeRoomId] = useState<number | null>(null);
 const requestBooking = async(roomId: number)=>{
    const token = Cookies.get('access-token');
    setRequesting(true);
    setTimeConflict(false);
    setConflicts([]);
    try {
        const res = await fetch(getUrl(`requestBooking`), {
          method: "POST",
          headers: { Authorization: "Bearer " + token, "Content-Type": "application/json"},
          body: JSON.stringify({
            room_id: roomId,
            start_time: `${selectedDate}T${startTime}:00`,
            end_time: `${selectedDate}T${endTime}:00`,
          })
        });
        if (res.ok) {
          const data = await res.json();
          console.log(data);
          setSuccessfulReq(true);
          setConfirmDate(Date.now() + 10 * 60 * 1000);
          setNow(Date.now());
          setTentativeRoomId(data.bookDetails.id);
          console.log(data);
        }
        else if(res.status === 409){
            const data = await res.json();
            setTimeConflict(true);
            setConflicts(data.conflicts ?? []);
            return;
        }
        else if (res.status === 401) {
          Cookies.remove("access-token");
          toast.error("Session expired. Please log in again.");
          navigate("/");
          return;
        }
        else {
          toast.error("Couldn't submit your booking. Please try again.");
        }
      } catch (error) {
        console.error(error);
        toast.error("Network error. Check your connection.");
      } finally {
        setRequesting(false);
      }
  }
 
  //--- The 10 minute countdown ---//
  useEffect(()=>{
    if(!successfulReq) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return ()=> clearInterval(id);
  }, [successfulReq]);
  //Get nice time formatting to display
  const remainingMs = Math.max(0, confirmDate - now);
  const mm = String(Math.floor(remainingMs / 60000)).padStart(2, "0");
  const ss = String(Math.floor((remainingMs % 60000) / 1000)).padStart(2, "0");



  //--- Clear any conflict warning when the user adjusts the date or time ---//
  useEffect(() => {
    setTimeConflict(false);
    setConflicts([]);
  }, [selectedDate, startTime, endTime]);


  //--- Confirm Booking section ---//
  const [confirmedBooking, setConfirmedBooking] = useState(false);
  const confirmBooking = async (id: number) => {
    const token = Cookies.get("access-token");
    try {
      const res = await fetch(getUrl(`confirmBooking/${id}`), {
        method: "PATCH",
        headers: { Authorization: "Bearer " + token },
      });
      const data = await res.json();
      setConfirmedBooking(true);
      console.log(data);
    } catch (error) {
      console.error(error);
      toast.error("Network error. Check your connection.");
    }
  };



  const [sortByCapacity, setSortByCapacity] = useState<"none" | "asc" | "desc">("none");
  const [nameFilter, setNameFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "tentative" | "confirmed">("all");

  const uniqueRoomNames = Array.from(new Set(rooms.map((r) => r.name)));

  const statusOptions: { value: typeof statusFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "active", label: "Active" },
    { value: "tentative", label: "Tentative" },
    { value: "confirmed", label: "Confirmed" },
  ];

  const filterRooms = rooms
    .filter((r) => nameFilter === "all" || r.name === nameFilter)
    .filter((r) => {
      if (statusFilter === "all") return true;
      if (statusFilter === "active") return r.is_active;
      return r.status === statusFilter;
    })
    .sort((a, b) =>
      sortByCapacity === "asc" ? a.capacity - b.capacity
      : sortByCapacity === "desc" ? b.capacity - a.capacity
      : 0
    );


  const profileInitial = userInfo?.userName
    ? userInfo.userName.trim().charAt(0).toUpperCase()
    : "?";

  return (
    <div className="min-h-screen text-neutral-900">
      <header className="sticky top-0 z-20 backdrop-blur-md bg-white/60 border-b border-white/40">
        <nav className="w-11/12 max-w-6xl mx-auto flex items-center justify-between py-3 md:py-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 text-white text-sm font-bold">
              M
            </span>
            <span className="text-lg md:text-xl font-bold tracking-tight">
              MeetMe
            </span>
          </div>

          <button
            type="button"
            onClick={() => navigate("/UserProfile")}
            className="flex items-center gap-2 rounded-full border border-neutral-300 bg-white/80
                       hover:bg-white hover:border-neutral-400 pl-1 pr-3 py-1 transition-all duration-200 cursor-pointer"
            title="Go to profile"
          >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-neutral-900 text-white text-xs font-bold">
              {profileInitial}
            </span>
            <span className="text-sm font-medium max-w-[140px] truncate">
              {userInfo?.userName ?? "Profile"}
            </span>
          </button>
        </nav>
      </header>

      <main className="w-11/12 max-w-6xl mx-auto px-2 py-10 md:py-14">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-8 md:mb-10">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
              Available rooms
            </h1>
            <p className="mt-2 text-sm md:text-base text-neutral-600">
              Browse {rooms.length} room{rooms.length === 1 ? "" : "s"} and pick
              the one that fits your team.
            </p>
          </div>
        </div>


        {/* --- This is the filtering section --- */}
        <div className="mb-6 md:mb-8 rounded-2xl bg-white/70 backdrop-blur-sm border border-white/60 shadow-sm p-4 md:p-5">
          <div className="flex flex-col lg:flex-row lg:items-end gap-4 lg:gap-6">
            <label className="flex flex-col gap-1.5 lg:w-56">
              <span className="text-xs font-medium text-neutral-700">Sort by capacity</span>
              <div className="relative">
                <select
                  value={sortByCapacity}
                  onChange={(e) => setSortByCapacity(e.target.value as typeof sortByCapacity)}
                  className="w-full appearance-none rounded-lg border border-neutral-300 bg-white px-3 py-2 pr-9 text-sm
                             focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all cursor-pointer"
                >
                  <option value="none">Default</option>
                  <option value="asc">Low to high</option>
                  <option value="desc">High to low</option>
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 text-xs">
                  ▾
                </span>
              </div>
            </label>

            <label className="flex flex-col gap-1.5 lg:w-64">
              <span className="text-xs font-medium text-neutral-700">Room name</span>
              <div className="relative">
                <select
                  value={nameFilter}
                  onChange={(e) => setNameFilter(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-neutral-300 bg-white px-3 py-2 pr-9 text-sm
                             focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all cursor-pointer"
                >
                  <option value="all">All rooms</option>
                  {uniqueRoomNames.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 text-xs">
                  ▾
                </span>
              </div>
            </label>

            <div className="flex flex-col gap-1.5 flex-1">
              <span className="text-xs font-medium text-neutral-700">Status</span>
              <div className="inline-flex flex-wrap gap-1.5 rounded-full bg-neutral-100 border border-neutral-200 p-1 w-fit">
                {statusOptions.map((opt) => {
                  const active = statusFilter === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setStatusFilter(opt.value)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer ${
                        active
                          ? "bg-neutral-900 text-white shadow-sm"
                          : "text-neutral-600 hover:text-neutral-900"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>


        {/* --- This section is displaying all the rooms. Also checks if there are no rooms to render text accordingly --- */}
        {rooms.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white/60 p-10 text-center">
            <p className="text-neutral-600">No rooms available right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {filterRooms.map((data, i) => (
              <motion.article
                initial={{ opacity: 0, filter: "blur(6px)", y: 12 }}
                whileInView={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                transition={{
                  duration: 0.7,
                  ease: [0.16, 1, 0.3, 1],
                  delay: i * 0.04,
                }}
                viewport={{ once: true }}
                key={i}
                className="group relative rounded-2xl bg-white/70 backdrop-blur-sm border border-white/60
                           p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:scale-110 transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-3 mb-5">
                  <h3 className="text-lg font-semibold tracking-tight leading-snug">
                    {data.name}
                  </h3>
                  <span
                    className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                      data.is_active
                        ? "bg-neutral-900 text-white border border-neutral-900"
                        : "bg-neutral-50 text-neutral-500 border border-neutral-300"
                    }`}
                  >
                    {data.is_active ? "Active" : "Inactive"}
                  </span>
                </div>

                <dl className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-neutral-500">Capacity</dt>
                    <dd className="font-medium">
                      {data.capacity}{" "}
                      {data.capacity === 1 ? "person" : "people"}
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-neutral-500 shrink-0">Purpose</dt>
                    <dd
                      className="font-medium text-right max-w-[65%] truncate"
                      title={data.purpose}
                    >
                      {data.purpose}
                    </dd>
                  </div>
                </dl>

                <button
                  onClick={()=> {setSelectedRoom(data); roomDetails(data.id); setOpenDetailsModal(true)}}
                  type="button"
                  disabled={!data.is_active}
                  className="mt-6 w-full bg-neutral-900 text-white rounded-full py-2 text-sm font-medium
                             hover:bg-neutral-800 transition-all duration-200 cursor-pointer
                             disabled:bg-neutral-300 disabled:cursor-not-allowed"
                >
                  {data.is_active ? "Book room" : "Unavailable"}
                </button>
              </motion.article>
            ))}
          </div>
        )}
      </main>

      {/* --- This is the Room modal section --- */}
      {openDetailsModal && (
        <section
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-md p-4"
          onClick={() => setOpenDetailsModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-[92vw] max-w-[560px] max-h-[90vh] overflow-y-auto rounded-2xl bg-white/95 backdrop-blur-md border border-white/60 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-4 border-b border-neutral-200/70">
              <div className="min-w-0">
                <h2 className="text-xl font-bold tracking-tight truncate">
                  {selectedRoom?.name ?? "Room details"}
                </h2>
                <p className="mt-0.5 text-xs text-neutral-500">
                  Schedule and availability
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpenDetailsModal(false)}
                className="flex items-center justify-center border border-neutral-300 hover:border-neutral-400 rounded-full w-7 h-7 text-xs cursor-pointer transition-colors"
              >
                X
              </button>
            </div>

            {requesting ? (
              <div className="px-6 py-16 flex flex-col items-center justify-center text-center">
                <div className="h-10 w-10 rounded-full border-2 border-neutral-200 border-t-neutral-900 animate-spin" />
                <p className="mt-5 text-sm font-medium">Submitting request…</p>
                <p className="mt-1 text-xs text-neutral-500">Talking to the server, hang tight.</p>
              </div>
            ) : confirmedBooking ? (
              <div className="px-6 py-12 flex flex-col items-center justify-center text-center">
                <div className="h-14 w-14 rounded-full bg-neutral-900 text-white flex items-center justify-center text-2xl font-bold">
                  ✓
                </div>
                <h3 className="mt-5 text-lg font-bold tracking-tight">Booking confirmed</h3>
                <p className="mt-2 text-sm text-neutral-600 max-w-[320px]">
                  Your room is locked in. You can find it any time in your profile.
                </p>
                <button
                  type="button"
                  onClick={() => setOpenDetailsModal(false)}
                  className="mt-6 rounded-full bg-neutral-900 text-white px-6 py-2 text-sm font-medium hover:bg-neutral-800 transition-all cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : successfulReq ? (
              <div className="px-6 py-12 flex flex-col items-center justify-center text-center">
                <div className="h-14 w-14 rounded-full bg-neutral-900 text-white flex items-center justify-center text-2xl font-bold">
                  ✓
                </div>
                <h3 className="mt-5 text-lg font-bold tracking-tight">Request submitted</h3>
                <p className="mt-2 text-sm text-neutral-600 max-w-[320px]">
                  Your booking is now{" "}
                  <span className="font-semibold">tentative</span>. Confirm
                  before the timer runs out.
                </p>

                <div className="mt-6 flex flex-col items-center">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                    Expires in
                  </span>
                  <div
                    className={`mt-1.5  text-4xl font-bold tracking-tight tabular-nums transition-colors duration-300 ${
                      remainingMs === 0
                        ? "text-red-600"
                        : remainingMs < 2 * 60 * 1000
                        ? "text-amber-600"
                        : "text-neutral-900"
                    }`}
                  >
                    {remainingMs === 0 ? (
                      "Expired"
                    ) : (
                      <>
                        {mm}
                        <span className="opacity-40">:</span>
                        {ss}
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-7 flex items-center gap-3 w-full max-w-[320px]">
                  <button
                    type="button"
                    onClick={() => setOpenDetailsModal(false)}
                    className="flex-1 rounded-full border border-neutral-300 px-5 py-2 text-sm font-medium hover:bg-neutral-50 transition-all cursor-pointer"
                  >
                    Confirm Later
                  </button>
                  <button
                     disabled={remainingMs === 0 || tentativeRoomId === null}
                    onClick={()=> confirmBooking(tentativeRoomId)}
                    type="button"
                    className="flex-1 rounded-full bg-neutral-900 text-white px-5 py-2 text-sm font-medium hover:bg-neutral-800 transition-all cursor-pointer disabled:bg-neutral-300 disabled:cursor-not-allowed"
                  >
                    Confirm now
                  </button>
                </div>
              </div>
            ) : (
            <>
            <div className="px-6 py-5 space-y-6">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-3">
                  Room details
                </h3>
                <dl className="rounded-xl border border-neutral-200/80 divide-y divide-neutral-200/80 text-sm">
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <dt className="text-neutral-500">Capacity</dt>
                    <dd className="font-medium">
                      {selectedRoom?.capacity}{" "}
                      {selectedRoom?.capacity === 1 ? "person" : "people"}
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-3 px-4 py-2.5">
                    <dt className="text-neutral-500 shrink-0">Purpose</dt>
                    <dd className="font-medium text-right">
                      {selectedRoom?.purpose}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <dt className="text-neutral-500">Status</dt>
                    <dd>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                          selectedRoom?.is_active
                            ? "bg-neutral-900 text-white border border-neutral-900"
                            : "bg-neutral-50 text-neutral-500 border border-neutral-300"
                        }`}
                      >
                        {selectedRoom?.is_active ? "Active" : "Inactive"}
                      </span>
                    </dd>
                  </div>
                </dl>
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-3">
                  Existing bookings
                  {roomSchedule?.room_schedule_details && (
                    <span className="ml-2 text-neutral-400 normal-case tracking-normal font-normal">
                      ({roomSchedule.room_schedule_details.length})
                    </span>
                  )}
                </h3>
                {!roomSchedule ? (
                  <div className="rounded-xl border border-neutral-200/80 px-4 py-3 text-sm">
                    <p className="text-neutral-500">Loading schedule…</p>
                  </div>
                ) : roomSchedule.room_schedule_details.length === 0 ? (
                  <div className="rounded-xl border border-neutral-200/80 px-4 py-3 text-sm">
                    <p className="text-neutral-500">No bookings yet — wide open.</p>
                  </div>
                ) : (
                  <ul className="rounded-xl border border-neutral-200/80 divide-y divide-neutral-200/80 text-sm">
                    {roomSchedule.room_schedule_details.map((b) => (
                      <li key={b.id} className="px-4 py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium truncate">
                            {new Date(b.start_time).toLocaleDateString(undefined, {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}
                          </div>
                          <div className="text-xs text-neutral-500">
                            {new Date(b.start_time).toLocaleTimeString(undefined, {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                            {" – "}
                            {new Date(b.end_time).toLocaleTimeString(undefined, {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                        <span
                          className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                            b.status === "confirmed"
                              ? "bg-neutral-900 text-white border border-neutral-900"
                              : b.status === "tentative"
                              ? "bg-amber-50 text-amber-800 border border-amber-300"
                              : "bg-neutral-50 text-neutral-500 border border-neutral-300"
                          }`}
                        >
                          {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-3">
                  Pick a date
                </h3>
                <label className="flex flex-col gap-1.5">
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm
                               focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all cursor-pointer"
                  />
                  <span className="text-xs text-neutral-500">
                    Booked dates above are unavailable.
                  </span>
                </label>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-neutral-700">Start time</span>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm
                                 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all cursor-pointer"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-neutral-700">End time</span>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      min={startTime || undefined}
                      className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm
                                 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all cursor-pointer"
                    />
                  </label>
                </div>

                {timeConflict && (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm">
                    <div className="flex items-start gap-2">
                      <span className="shrink-0 inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-[11px] font-bold">!</span>
                      <div className="min-w-0">
                        <p className="font-semibold text-red-800">Time slot unavailable</p>
                        <p className="mt-0.5 text-red-700 text-xs">
                          Your selection conflicts with an existing booking. Pick a different slot.
                        </p>
                        {conflicts.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {conflicts.map((c) => (
                              <li key={c.id} className="text-xs text-red-800">
                                {new Date(c.start_time).toLocaleDateString(undefined, {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                })}
                                {" · "}
                                {new Date(c.start_time).toLocaleTimeString(undefined, {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                                {" – "}
                                {new Date(c.end_time).toLocaleTimeString(undefined, {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                                <span className="ml-2 text-[10px] uppercase tracking-wider text-red-600/80">
                                  {c.status}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>


            </div>
           
            <div className="px-6 pb-6 pt-2 flex flex-col sm:flex-row gap-3 sm:justify-end">
              <button
                type="button"
                onClick={() => setOpenDetailsModal(false)}
                className="rounded-full border border-neutral-300 px-5 py-2 text-sm font-medium hover:bg-neutral-50 transition-all cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => selectedRoom && requestBooking(selectedRoom.id)}
                className="rounded-full bg-neutral-900 text-white px-5 py-2 text-sm font-medium
                           hover:bg-neutral-800 transition-all cursor-pointer disabled:bg-neutral-300 disabled:cursor-not-allowed"
              >
                Request booking
              </button>

            </div>
            </>
            )}
          </motion.div>
        </section>
      )}
    </div>
  );
};
export default Dashboard;
